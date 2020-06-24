import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('The type must be income or outcome.', 400);
    }

    if (
      type === 'outcome' &&
      value > (await transactionsRepository.getBalance()).total
    ) {
      throw new AppError("The outcome value can't be greater than the balance");
    }

    let categoryRecord = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryRecord) {
      categoryRecord = categoryRepository.create({
        title: category,
      });
      categoryRecord = await categoryRepository.save(categoryRecord);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: categoryRecord.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
