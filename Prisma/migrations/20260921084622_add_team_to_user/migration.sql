-- AlterTable
ALTER TABLE "User" ADD COLUMN     "team_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "SUPPORT_TEAM"("team_id") ON DELETE SET NULL ON UPDATE CASCADE;
