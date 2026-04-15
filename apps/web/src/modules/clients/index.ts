export type { Client, CreateClientDTO, UpdateClientDTO, IClientRepository } from "./domain/types";
export { createClientSchema, updateClientSchema } from "./domain/schemas";
export { ClientService } from "./application/client.service";
export { MongoClientRepository, getClientRepository } from "./infrastructure/client.repository";

import { ClientService } from "./application/client.service";
import { getClientRepository } from "./infrastructure/client.repository";

let _svc: ClientService | null = null;
export function getClientService(): ClientService {
    if (!_svc) _svc = new ClientService(getClientRepository());
    return _svc;
}
