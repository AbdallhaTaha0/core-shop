import { getSequelize } from '../db/sequelize';
import { Address } from '../models/index';
import type { CreateAddressDto, UpdateAddressDto } from '../schemas/address.schema';
import { AppError } from '../utils/AppError';

export async function listAddresses(userId: string): Promise<Address[]> {
  return Address.findAll({
    where: { userId },
    order: [
      ['isDefault', 'DESC'],
      ['createdAt', 'ASC'],
    ],
  });
}

export async function createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
  const sequelize = getSequelize();
  return sequelize.transaction(async (t) => {
    const existing = await Address.count({ where: { userId }, transaction: t });
    // The first address is always the default, regardless of input.
    const isDefault = existing === 0 ? true : dto.isDefault;
    if (isDefault) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction: t });
    }
    return Address.create(
      {
        userId,
        label: dto.label ?? null,
        fullName: dto.fullName,
        line1: dto.line1,
        line2: dto.line2 ?? null,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        isDefault,
      },
      { transaction: t },
    );
  });
}

export async function updateAddress(
  userId: string,
  id: string,
  dto: UpdateAddressDto,
): Promise<Address> {
  const address = await Address.findOne({ where: { id, userId } });
  if (address === null) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }
  const sequelize = getSequelize();
  await sequelize.transaction(async (t) => {
    if (dto.isDefault === true) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction: t });
    }
    await address.update(
      {
        label: dto.label,
        fullName: dto.fullName,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        isDefault: dto.isDefault,
      },
      { transaction: t },
    );
  });
  return address;
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const address = await Address.findOne({ where: { id, userId } });
  if (address === null) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }
  const sequelize = getSequelize();
  await sequelize.transaction(async (t) => {
    await address.destroy({ transaction: t });
    // Deleting the default promotes the oldest remaining address so the
    // account keeps a usable default without extra round-trips.
    if (address.isDefault) {
      const next = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'ASC']],
        transaction: t,
      });
      if (next !== null) {
        next.isDefault = true;
        await next.save({ transaction: t });
      }
    }
  });
}
