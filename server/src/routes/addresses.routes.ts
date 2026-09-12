import { Router } from 'express';
import {
  createUserAddress,
  deleteUserAddress,
  getAddresses,
  updateUserAddress,
} from '../controllers/addresses.controller';
import { authenticate } from '../middleware/authenticate';
import { validateBody, validateParams } from '../middleware/validate';
import {
  AddressIdParamsSchema,
  CreateAddressSchema,
  UpdateAddressSchema,
} from '../schemas/address.schema';

// Personal address book. Every lookup is scoped to the session user: another
// user's address id resolves to 404, never to their data.
const addressesRouter = Router();

addressesRouter.use(authenticate);

addressesRouter.get('/', getAddresses);
addressesRouter.post('/', validateBody(CreateAddressSchema), createUserAddress);
addressesRouter.patch(
  '/:id',
  validateParams(AddressIdParamsSchema),
  validateBody(UpdateAddressSchema),
  updateUserAddress,
);
addressesRouter.delete('/:id', validateParams(AddressIdParamsSchema), deleteUserAddress);

export default addressesRouter;
