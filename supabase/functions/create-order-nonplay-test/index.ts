// Dedicated synthetic lane. Never import the live order/settlement handler.
import { nonplayTestHandlers } from "../_shared/nonplayTestRuntime.ts";
Deno.serve(nonplayTestHandlers.create);
