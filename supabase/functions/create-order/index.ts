// Standard website route: native-request guard remains in the shared handler.
import { handleCreateOrder } from "../_shared/createOrderHandler.ts";

Deno.serve((req: Request) => handleCreateOrder(req));
