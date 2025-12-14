-- CreateTable
CREATE TABLE "ProblemCache" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProblemCache_problemId_key" ON "ProblemCache"("problemId");

-- CreateIndex
CREATE INDEX "ProblemCache_problemId_idx" ON "ProblemCache"("problemId");
