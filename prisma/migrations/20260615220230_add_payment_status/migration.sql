-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StatementBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "cycleKey" TEXT NOT NULL,
    "cycleStartDate" TEXT NOT NULL,
    "cycleEndDate" TEXT NOT NULL,
    "statementTotalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StatementBalance_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StatementBalance" ("cardId", "createdAt", "cycleEndDate", "cycleKey", "cycleStartDate", "id", "notes", "statementTotalCents", "updatedAt") SELECT "cardId", "createdAt", "cycleEndDate", "cycleKey", "cycleStartDate", "id", "notes", "statementTotalCents", "updatedAt" FROM "StatementBalance";
DROP TABLE "StatementBalance";
ALTER TABLE "new_StatementBalance" RENAME TO "StatementBalance";
CREATE INDEX "StatementBalance_cardId_idx" ON "StatementBalance"("cardId");
CREATE UNIQUE INDEX "StatementBalance_cardId_cycleKey_key" ON "StatementBalance"("cardId", "cycleKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
