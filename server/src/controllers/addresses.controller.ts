import type { NextFunction, Request, Response } from 'express';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../services/addresses.service';
import { AppError } from '../utils/AppError';

function userId(req: Request): string {
  if (req.user === undefined) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return req.user.id;
}

export async function getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ data: await listAddresses(userId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function createUserAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.body is validated by validateBody(CreateAddressSchema).
    res.status(201).json({ address: await createAddress(userId(req), req.body) });
  } catch (err) {
    next(err);
  }
}

export async function updateUserAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res
      .status(200)
      .json({ address: await updateAddress(userId(req), req.params.id as string, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteAddress(userId(req), req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
