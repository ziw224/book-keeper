-- CreateTable
CREATE TABLE "StatementBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "cycleKey" TEXT NOT NULL,
    "cycleStartDate" TEXT NOT NULL,
    "cycleEndDate" TEXT NOT NULL,
    "statementTotalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StatementBalance_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StatementBalance_cardId_idx" ON "StatementBalance"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "StatementBalance_cardId_cycleKey_key" ON "StatementBalance"("cardId", "cycleKey");
