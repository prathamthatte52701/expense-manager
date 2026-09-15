import { todayInput } from '../../lib/api'

export const emptyTransactionForm = (category = '') => ({
  category,
  amount: '',
  date: todayInput(),
  note: '',
})

export function transactionToForm(transaction, categories = []) {
  return {
    category: transaction?.category || categories[0] || '',
    amount: transaction?.amount ?? '',
    date: transaction?.date?.slice(0, 10) || todayInput(),
    note: transaction?.note || '',
  }
}

export function serializeTransactionForm(form) {
  return {
    category: form.category,
    amount: form.amount,
    date: form.date,
    note: (form.note || '').trim(),
  }
}
