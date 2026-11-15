"""Run existing local Phase C suite, redirecting only its evidence destination."""
from pathlib import Path
source_path=Path(__file__).resolve().parents[4]/'supabase/tests/run-phase-c-local.py'
source=source_path.read_text().replace("evidence=root/'docs/audit/evidence/phase-c-20261111'", "evidence=root/'docs/audit/evidence/android-blocker-fix-20261111'")
exec(compile(source,str(source_path),'exec'),{'__file__':str(source_path),'__name__':'__main__'})
