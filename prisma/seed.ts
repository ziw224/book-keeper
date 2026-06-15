import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.transaction.deleteMany()
  await prisma.card.deleteMany()

  // Card 1: close day 15
  const sapphire = await prisma.card.create({
    data: {
      name: 'Sapphire Reserve',
      issuer: 'Chase',
      last4: '4821',
      type: 'credit',
      statementCloseDay: 15,
    },
  })

  // Card 2: close day 28
  const gold = await prisma.card.create({
    data: {
      name: 'Gold Card',
      issuer: 'Amex',
      last4: '0037',
      type: 'credit',
      statementCloseDay: 28,
    },
  })

  // Transactions for Sapphire (close day 15)
  // Cycle June 2026 = 5/16 – 6/15
  // Cycle July 2026 = 6/16 – 7/15
  const sapphireTxns = [
    // June cycle (5/16 – 6/15)
    { date: '2026-05-16', merchant: 'Starbucks', amountCents: 550, category: 'Dining' },
    { date: '2026-05-20', merchant: 'Whole Foods', amountCents: 8743, category: 'Groceries' },
    { date: '2026-06-01', merchant: 'Shell Gas', amountCents: 4520, category: 'Transport' },
    { date: '2026-06-10', merchant: 'Amazon', amountCents: 3299, category: 'Shopping' },
    { date: '2026-06-15', merchant: 'Netflix', amountCents: 1599, category: 'Entertainment' },
    // Boundary: exactly on close day → belongs to June cycle
    // Refund in June cycle
    { date: '2026-06-05', merchant: 'Amazon', amountCents: -1500, category: 'Shopping', notes: 'Refund for damaged item' },
    // July cycle (6/16 – 7/15)
    { date: '2026-06-16', merchant: 'Uber', amountCents: 2340, category: 'Transport' },
    { date: '2026-06-25', merchant: 'Trader Joes', amountCents: 6215, category: 'Groceries' },
    { date: '2026-07-01', merchant: 'Delta Airlines', amountCents: 35000, category: 'Travel' },
    { date: '2026-07-10', merchant: 'CVS Pharmacy', amountCents: 1875, category: 'Health' },
  ]

  // Transactions for Gold Card (close day 28)
  // June cycle = 5/29 – 6/28
  // July cycle = 6/29 – 7/28
  const goldTxns = [
    // June cycle (5/29 – 6/28)
    { date: '2026-05-30', merchant: 'Costco', amountCents: 15680, category: 'Groceries' },
    { date: '2026-06-05', merchant: 'Electric Co', amountCents: 9500, category: 'Utilities' },
    { date: '2026-06-15', merchant: 'Sushi Place', amountCents: 7800, category: 'Dining' },
    { date: '2026-06-28', merchant: 'Spotify', amountCents: 1099, category: 'Entertainment' },
    // Refund
    { date: '2026-06-20', merchant: 'Costco', amountCents: -4500, category: 'Groceries', notes: 'Return' },
    // July cycle (6/29 – 7/28)
    { date: '2026-07-01', merchant: 'Chipotle', amountCents: 1245, category: 'Dining' },
    { date: '2026-07-15', merchant: 'Home Depot', amountCents: 12399, category: 'Shopping' },
  ]

  for (const txn of sapphireTxns) {
    await prisma.transaction.create({
      data: { cardId: sapphire.id, ...txn },
    })
  }

  for (const txn of goldTxns) {
    await prisma.transaction.create({
      data: { cardId: gold.id, ...txn },
    })
  }

  // Card 3: Debit card (no statement close day)
  const checking = await prisma.card.create({
    data: {
      name: 'Checking Account',
      issuer: 'Chase',
      last4: '9012',
      type: 'debit',
      statementCloseDay: null,
    },
  })

  const debitTxns = [
    { date: '2026-06-02', merchant: 'Farmers Market', amountCents: 3200, category: 'Groceries' },
    { date: '2026-06-10', merchant: 'Gas Station', amountCents: 5500, category: 'Transport' },
    { date: '2026-06-18', merchant: 'ATM Fee', amountCents: 300, category: 'Fees' },
    { date: '2026-06-25', merchant: 'Farmers Market', amountCents: -800, category: 'Groceries', notes: 'Overcharge refund' },
  ]

  for (const txn of debitTxns) {
    await prisma.transaction.create({
      data: { cardId: checking.id, ...txn },
    })
  }

  console.log('Seeded 3 cards and', sapphireTxns.length + goldTxns.length + debitTxns.length, 'transactions')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
