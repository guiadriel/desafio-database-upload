import { getRepository, getCustomRepository, In } from 'typeorm';
import { createReadStream } from 'fs';
import csvParser from 'csv-parse';
import path from 'path';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

import uploadConfig from '../config/upload';

interface Request {
  importedFile: string;
}

interface TransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

async function loadCSV(filePath: string): Promise<TransactionData[]> {
  const readedFile = createReadStream(
    path.resolve(uploadConfig.directory, filePath),
  );
  const parsedStream = csvParser({ from_line: 2, ltrim: true, rtrim: true });
  const parsedCSV = readedFile.pipe(parsedStream);

  const lines: TransactionData[] = [];

  parsedCSV.on('data', line => {
    const [title, type, value, category] = line;
    lines.push({
      title,
      value,
      type,
      category,
    });
  });

  await new Promise(resolve => {
    parsedCSV.on('end', resolve);
  });

  return lines;
}

class ImportTransactionsService {
  async execute({ importedFile }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const readedCSV = await loadCSV(importedFile);

    const categories = readedCSV.map(line => line.category);
    const existingCategories = await categoriesRepository.find({
      title: In(categories),
    });

    // Filtrar apenas as categorias que não existem no banco de dados
    const uniqueList = categories
      .filter(
        category =>
          !existingCategories.find(
            existingCategory => existingCategory.title === category,
          ),
      )
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      uniqueList.map(category => ({ title: category })),
    );
    const addedCategories = await categoriesRepository.save(newCategories);
    const fullCategories = [...existingCategories, ...addedCategories];

    const transactions = transactionsRepository.create(
      readedCSV.map(trans => {
        const category = fullCategories.find(
          cat => cat.title === trans.category,
        );
        const transaction = {
          title: trans.title,
          value: trans.value,
          type: trans.type,
          category_id: category !== undefined ? category.id : '0',
        };
        return transaction;
      }),
    );

    await transactionsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
