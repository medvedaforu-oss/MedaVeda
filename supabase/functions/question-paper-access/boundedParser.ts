// The instance adapters below are deliberately tied to pdf-lib 1.17.1.
// Never patch shared prototypes: Notes and other endpoints keep their own parser.
// deno-lint-ignore-file no-explicit-any
import { PDFParser, PDFObjectParser, PDFObject, PDFRawStream, PDFRef, PDFName, PDFNumber, PDFArray, PDFDict, PDFXRefStreamParser, decodePDFRawStream } from "npm:pdf-lib@1.17.1";

const MAX_OBJECTS = 20000, MAX_DECODED = 8*1024*1024, MAX_OPERATIONS = 16000000;
export async function parseBoundedPdf(bytes: Uint8Array) {
  const started = Date.now();
  let operations = 0, objects = 0, directObjects = 0, expanded = 0;
  const check = () => { if (++operations > MAX_OPERATIONS || (operations%1024===0 && Date.now()-started>1500)) throw new Error("PDF validation budget exceeded"); };
  const parser: any = PDFParser.forBytesWithOptions(bytes,10,true);
  const context = parser.context;
  const streams: PDFRawStream[] = [];
  const positions = new Map<string,{offset?:number;container?:number;index?:number}>();
  // All recursion and byte access are budgeted, including malformed arrays at EOF.
  function guard(p: any) {
    const cursor = p.bytes;
    let depth = 0;
    for (const method of ["next","peek","peekAhead","peekAt","moveTo"]) {
      const original = cursor[method].bind(cursor);
      cursor[method] = (...args: number[]) => { check(); if (method==="moveTo" && (!Number.isSafeInteger(args[0]) || args[0]<0 || args[0]>cursor.length)) throw new Error("Invalid PDF offset"); return original(...args); };
    }
    // Streams reference immutable input; avoid copying a 50 MiB scanned image.
    cursor.slice = (start: number,end: number) => cursor.bytes.subarray(start,end);
    const parse = p.parseObject.bind(p);
    p.parseObject = () => {
      check();if (++directObjects>MAX_OBJECTS*20)throw new Error("PDF direct object limit exceeded");if (++depth>64) throw new Error("PDF nesting limit exceeded");
      try { return parse(); } finally { depth--; }
    };
    return p;
  }
  guard(parser);
  // Recovery is useful in a viewer, but must not create a validation receipt.
  parser.maybeRecoverRoot = () => {};
  // Forward indirect Length values are normal in scans. Search native byte
  // buffers once instead of spending parser operations on every image byte.
  parser.findEndOfStreamFallback = () => {
    const input: Uint8Array=parser.bytes.bytes, start=parser.bytes.offset();
    const marker=new TextEncoder().encode("endstream");
    for(let at=input.indexOf(101,start);at>=0;at=input.indexOf(101,at+1)){
      check();if(!marker.every((byte,index)=>input[at+index]===byte))continue;
      let next=at+marker.length;while([0,9,10,12,13,32].includes(input[next]))next++;
      const ending=new TextDecoder().decode(input.subarray(next,next+6));if(ending!=="endobj")continue;
      parser.bytes.moveTo(at+marker.length);return at;
    }
    throw new Error("Missing PDF stream terminator");
  };
  type Entry = {ref:PDFRef;offset:number;deleted:boolean;inObjectStream?:boolean};
  type Section = {entries:Entry[];prev?:number;supplement?:number;root?:PDFObject;info?:PDFObject;encrypt?:PDFObject};
  const sections=new Map<number,Section>();let activeSection:Section|undefined;
  function sectionInfo(section:Section,dict:PDFDict){
    const link=(name:string)=>{const value=dict.get(PDFName.of(name));return value===undefined?undefined:integer(value,bytes.length-1);};
    section.prev=link("Prev");section.supplement=link("XRefStm");section.root=dict.get(PDFName.of("Root"));section.info=dict.get(PDFName.of("Info"));section.encrypt=dict.get(PDFName.of("Encrypt"));
  }
  parser.maybeParseTrailerDict=()=>{
    parser.skipWhitespaceAndComments();if(!parser.matchKeyword(new TextEncoder().encode("trailer")))return;
    parser.skipWhitespaceAndComments();const dict=parser.parseDict();
    if(!activeSection)throw new Error("PDF trailer has no cross-reference section");sectionInfo(activeSection,dict);
    context.trailerInfo={Root:dict.get(PDFName.of("Root")),Info:dict.get(PDFName.of("Info")),Encrypt:dict.get(PDFName.of("Encrypt"))};activeSection=undefined;
  };
  const advertised: {ref:PDFRef;offset:number;deleted:boolean;inObjectStream?:boolean}[]=[];
  function checkOffset(ref: PDFRef, offset: number) {
    if(!Number.isSafeInteger(offset)||offset<0||offset>=bytes.length)throw new Error("Invalid cross-reference offset");
    const header=new TextDecoder().decode(bytes.subarray(offset,Math.min(offset+80,bytes.length)));
    if(!new RegExp(`^${ref.objectNumber}\\s+${ref.generationNumber}\\s+obj\\b`).test(header))throw new Error("Cross-reference does not identify its object");
  }
  parser.maybeParseCrossRefSection = () => {
    parser.skipWhitespaceAndComments();const sectionOffset=parser.bytes.offset();if(!parser.matchKeyword(new TextEncoder().encode("xref")))return;
    activeSection={entries:[]};sections.set(sectionOffset,activeSection);
    parser.skipWhitespaceAndComments();
    while(parser.bytes.peek()>=48&&parser.bytes.peek()<=57){
      const first=parser.parseRawInt();parser.skipWhitespaceAndComments();const count=parser.parseRawInt();
      if(!Number.isSafeInteger(first)||first<0||!Number.isSafeInteger(count)||count<0||count>MAX_OBJECTS||advertised.length+count>MAX_OBJECTS)throw new Error("Cross-reference entry limit exceeded");
      for(let i=0;i<count;i++){
        parser.skipWhitespaceAndComments();const offset=parser.parseRawInt();parser.skipWhitespaceAndComments();const generation=parser.parseRawInt();parser.skipWhitespaceAndComments();const kind=parser.bytes.next();
        if((kind!==110&&kind!==102)||!Number.isSafeInteger(generation)||generation<0||generation>65535)throw new Error("Invalid cross-reference entry");
        const ref=PDFRef.of(first+i,generation);if(kind===110)checkOffset(ref,offset);const entry={ref,offset,deleted:kind===102};advertised.push(entry);activeSection.entries.push(entry);
      }
      parser.skipWhitespaceAndComments();
    }
  };
  function integer(value: unknown, max = MAX_OBJECTS): number {
    if (!(value instanceof PDFNumber) || !Number.isSafeInteger(value.asNumber()) || value.asNumber()<0 || value.asNumber()>max) throw new Error("Invalid PDF structural number");
    return value.asNumber();
  }
  function assign(ref: PDFRef, object: PDFObject) {
    check();if (++objects>MAX_OBJECTS) throw new Error("PDF object limit exceeded");
    context.assign(ref,object);
    if (object instanceof PDFRawStream) streams.push(object);
  }
  function decode(raw: PDFRawStream): Uint8Array {
    let data = raw.getContents();
    const filter = raw.dict.lookup(PDFName.of("Filter"));
    const filters = filter instanceof PDFArray ? filter.asArray() : filter ? [filter] : [];
    if (filters.length>4) throw new Error("PDF filter limit exceeded");
    for (const name of filters) {
      const dict = PDFDict.withContext(context);dict.set(PDFName.of("Filter"),name);
      const decoder: any = decodePDFRawStream(PDFRawStream.of(dict,data));
      const ensure = decoder.ensureBuffer?.bind(decoder), block = decoder.readBlock?.bind(decoder);
      if (!ensure || !block) throw new Error("Unsupported PDF structural filter");
      decoder.ensureBuffer = (size: number) => { check();let allocated=decoder.minBufferLength;while(allocated<size)allocated*=2;if (allocated>MAX_DECODED-expanded) throw new Error("PDF decompression limit exceeded");return ensure(size); };
      decoder.readBlock = () => { check();return block(); };
      for(const method of ["getCode","getBits"]){const inner=decoder[method]?.bind(decoder);if(inner)decoder[method]=(...args: unknown[])=>{check();return inner(...args);};}
      data = decoder.decode();expanded += data.length;
      if (expanded>MAX_DECODED) throw new Error("PDF decompression limit exceeded");
    }
    if (data.length>MAX_DECODED) throw new Error("PDF structural stream limit exceeded");
    return data;
  }
  parser.parseIndirectObject = async () => {
    parser.skipWhitespaceAndComments();const startOffset=parser.bytes.offset();
    const ref: PDFRef = parser.parseIndirectObjectHeader();
    positions.set(ref.toString(),{offset:startOffset});
    if (!Number.isSafeInteger(ref.objectNumber) || !Number.isSafeInteger(ref.generationNumber)) throw new Error("Invalid PDF reference");
    parser.skipWhitespaceAndComments();
    const object = parser.parseObject();
    parser.skipWhitespaceAndComments();
    if (!parser.matchKeyword(new TextEncoder().encode("endobj"))) throw new Error("Missing PDF object terminator");
    if (object instanceof PDFRawStream && object.dict.lookup(PDFName.of("Type")) === PDFName.of("ObjStm")) {
      streams.push(object);
      const count=integer(object.dict.lookup(PDFName.of("N"))), first=integer(object.dict.lookup(PDFName.of("First")),MAX_DECODED);
      if (objects+count>MAX_OBJECTS) throw new Error("PDF object limit exceeded");
      const data=decode(object);if(first>data.length)throw new Error("Invalid PDF object stream");
      const inner: any=guard(PDFObjectParser.forBytes(data.subarray(0,first),context));
      const offsets: {id:number;offset:number}[]=[];
      for(let i=0;i<count;i++) {
        inner.skipWhitespaceAndComments();const id=inner.parseRawInt();inner.skipWhitespaceAndComments();const offset=inner.parseRawInt();
        if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(offset)||offset<0||first+offset>=data.length)throw new Error("Invalid PDF object stream index");
        offsets.push({id,offset});
      }
      inner.skipWhitespaceAndComments();if(!inner.bytes.done())throw new Error("Invalid PDF object stream header");
      for(let i=0;i<offsets.length;i++) {
        const {id,offset}=offsets[i];if(i && offset<=offsets[i-1].offset)throw new Error("Invalid PDF object ordering");
        const end=i+1<count?first+offsets[i+1].offset:data.length;
        if(end<=first+offset||end>data.length)throw new Error("Invalid PDF object boundary");
        const childParser: any=guard(PDFObjectParser.forBytes(data.subarray(first+offset,end),context));
        const child=childParser.parseObject();childParser.skipWhitespaceAndComments();
        if(child instanceof PDFRawStream || !childParser.bytes.done())throw new Error("Invalid compressed PDF object");
        assign(PDFRef.of(id),child);positions.set(PDFRef.of(id).toString(),{container:ref.objectNumber,index:i});
      }
    } else if(object instanceof PDFRawStream && object.dict.lookup(PDFName.of("Type"))===PDFName.of("XRef")) {
      streams.push(object);
      integer(object.dict.lookup(PDFName.of("Size")));
      const widths=object.dict.lookup(PDFName.of("W"));
      if(!(widths instanceof PDFArray)||widths.size()!==3)throw new Error("Invalid PDF cross-reference widths");
      let row=0;for(const width of widths.asArray())row+=integer(width,4);
      if(!row)throw new Error("Invalid PDF cross-reference width");
      const indexes=object.dict.lookup(PDFName.of("Index"));let entries=integer(object.dict.lookup(PDFName.of("Size")));
      if(indexes){if(!(indexes instanceof PDFArray)||indexes.size()%2)throw new Error("Invalid PDF cross-reference index");entries=0;for(let i=0;i<indexes.size();i+=2){integer(indexes.get(i));entries+=integer(indexes.get(i+1));}}
      if(entries>MAX_OBJECTS)throw new Error("PDF cross-reference limit exceeded");
      let data=decode(object);
      const parms=object.dict.lookup(PDFName.of("DecodeParms"));
      // PNG prediction is common in scanner-generated cross-reference streams.
      if(parms instanceof PDFDict && parms.has(PDFName.of("Predictor")) && integer(parms.lookup(PDFName.of("Predictor")),15)>=10){
        const columns=parms.lookup(PDFName.of("Columns"));if(columns && integer(columns)!==row)throw new Error("Unsupported PDF predictor columns");
        if(data.length!==entries*(row+1))throw new Error("Invalid predicted cross-reference length");
        const output=new Uint8Array(entries*row);
        for(let y=0;y<entries;y++)for(let x=0;x<row;x++){
          check();const kind=data[y*(row+1)],value=data[y*(row+1)+x+1],left=x?output[y*row+x-1]:0,above=y?output[(y-1)*row+x]:0,corner=x&&y?output[(y-1)*row+x-1]:0;
          const estimate=left+above-corner,pa=Math.abs(estimate-left),pb=Math.abs(estimate-above),pc=Math.abs(estimate-corner);
          const prediction=kind===0?0:kind===1?left:kind===2?above:kind===3?Math.floor((left+above)/2):kind===4?(pa<=pb&&pa<=pc?left:pb<=pc?above:corner):-1;
          if(prediction<0)throw new Error("Invalid PDF predictor");output[y*row+x]=(value+prediction)&255;
        }
        data=output;
      }
      if(data.length!==entries*row)throw new Error("Invalid PDF cross-reference stream length");
      const dict=object.dict.clone(context);dict.delete(PDFName.of("Filter"));dict.delete(PDFName.of("DecodeParms"));
      const xrefEntries=PDFXRefStreamParser.forStream(PDFRawStream.of(dict,data)).parseIntoContext();
      if(advertised.length+xrefEntries.length>MAX_OBJECTS)throw new Error("Cross-reference entry limit exceeded");
      for(const entry of xrefEntries){if(!entry.deleted&&!entry.inObjectStream)checkOffset(entry.ref,entry.offset);advertised.push(entry);}
      const section:Section={entries:xrefEntries};sectionInfo(section,object.dict);sections.set(startOffset,section);
    } else assign(ref,object);
    return ref;
  };
  const parsed = await parser.parseDocument();
  if(parsed.trailerInfo.Encrypt)throw new Error("Encrypted PDF is unsupported");
  for(const stream of streams){
    const size=integer(parsed.lookup(stream.dict.get(PDFName.of("Length"))),50*1024*1024);
    const contents=stream.getContents();
    // pdf-lib's indirect-Length fallback includes the separator before endstream.
    if(contents.length!==size && !(contents.length-size<=2 && contents.length>size && contents.subarray(size).every(b=>b===10||b===13)))throw new Error("Invalid PDF stream length");
  }
  // Resolve every reference in dictionaries/arrays, including page Contents and
  // image Resources. Parent links may cycle normally, so visit each object once.
  const live = new Map<number,typeof advertised[number]>();
  const last=/startxref\s+(\d+)\s+%%EOF\s*$/.exec(new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-2048))));
  if(!last)throw new Error("Missing final cross-reference");
  const visitedSections=new Set<number>(),path=new Set<number>();let trailerRoot:PDFObject|undefined,trailerInfo:PDFObject|undefined,trailerEncrypt:PDFObject|undefined;
  function visit(offset:number,depth=0){
    if(path.has(offset)||depth>64)throw new Error("Invalid PDF cross-reference chain");if(visitedSections.has(offset))return;
    const section=sections.get(offset);if(!section)throw new Error("Missing linked PDF cross-reference section");path.add(offset);
    if(section.prev!==undefined){if(section.prev>=offset)throw new Error("Invalid previous cross-reference");visit(section.prev,depth+1);}
    for(const entry of section.entries)live.set(entry.ref.objectNumber,entry);
    if(section.root)trailerRoot=section.root;if(section.info)trailerInfo=section.info;if(section.encrypt)trailerEncrypt=section.encrypt;
    if(section.supplement!==undefined)visit(section.supplement,depth+1);
    path.delete(offset);visitedSections.add(offset);
  }
  visit(Number(last[1]));parsed.trailerInfo={Root:trailerRoot,Info:trailerInfo,Encrypt:trailerEncrypt};
  if(trailerEncrypt)throw new Error("Encrypted PDF is unsupported");
  const todo: unknown[]=[parsed.trailerInfo.Root,parsed.trailerInfo.Info];const seen=new Set<unknown>();
  while(todo.length){
    check();const value=todo.pop();
    if(value instanceof PDFRef){
      const entry=live.get(value.objectNumber),position=positions.get(value.toString());
      if(!entry||entry.deleted||!position)throw new Error("Missing advertised PDF object");
      if(entry.inObjectStream){
        const container=live.get(entry.offset);
        if(value.generationNumber!==0||position.container!==entry.offset||position.index!==entry.ref.generationNumber||!container||container.deleted||container.inObjectStream)throw new Error("Invalid compressed cross-reference");
      } else if(entry.ref.generationNumber!==value.generationNumber||entry.offset!==position.offset)throw new Error("Invalid PDF cross-reference coverage");
      const target=parsed.lookup(value);if(!target)throw new Error("Missing PDF object");todo.push(target);continue;
    }
    if(!value||seen.has(value))continue;seen.add(value);
    if(seen.size>MAX_OBJECTS*20)throw new Error("PDF reference limit exceeded");
    if(value instanceof PDFRawStream)todo.push(value.dict);
    else if(value instanceof PDFDict)todo.push(...value.values());
    else if(value instanceof PDFArray)todo.push(...value.asArray());
  }
  if(Date.now()-started>1500)throw new Error("PDF validation budget exceeded");
  return parsed;
}
