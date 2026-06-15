-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchant" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "recurringDay" INTEGER,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringRule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "recurringRuleId" TEXT,
    "isRecurringGenerated" BOOLEAN NOT NULL DEFAULT false,
    "recurringOccurrenceDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amountCents", "cardId", "category", "createdAt", "date", "id", "merchant", "notes", "updatedAt") SELECT "amountCents", "cardId", "category", "createdAt", "date", "id", "merchant", "notes", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_cardId_date_idx" ON "Transaction"("cardId", "date");
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
CREATE INDEX "Transaction_recurringRuleId_idx" ON "Transaction"("recurringRuleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
