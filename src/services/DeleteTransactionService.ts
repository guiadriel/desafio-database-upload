import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    // TODO
    const transactionRepository = getRepository(Transaction);

    const transaction = await transactionRepository.findOne({
      id,
    });

    if (!transaction) {
      throw new AppError('The transaction cannot be deleted.', 401);
    }

    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
