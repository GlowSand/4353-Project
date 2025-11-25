/*
  Warnings:

  - You are about to alter the column `createdAtMs` on the `assignments` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `location` on the `event_details` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(191)`.
  - You are about to alter the column `title` on the `notices` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(191)`.
  - You are about to alter the column `createdAtMs` on the `notices` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `password` on the `user_credentials` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `preferences` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `assignments` DROP FOREIGN KEY `assignments_volunteerId_fkey`;

-- DropForeignKey
ALTER TABLE `notices` DROP FOREIGN KEY `notices_volunteerId_fkey`;

-- DropForeignKey
ALTER TABLE `user_profiles` DROP FOREIGN KEY `user_profiles_userId_fkey`;

-- DropForeignKey
ALTER TABLE `volunteer_history` DROP FOREIGN KEY `volunteer_history_userId_fkey`;

-- DropIndex
DROP INDEX `volunteer_history_userId_fkey` ON `volunteer_history`;

-- AlterTable
ALTER TABLE `assignments` MODIFY `volunteerId` VARCHAR(191) NOT NULL,
    MODIFY `createdAtMs` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `event_details` MODIFY `eventName` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NOT NULL,
    MODIFY `location` VARCHAR(191) NOT NULL,
    MODIFY `urgency` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `notices` MODIFY `volunteerId` VARCHAR(191) NOT NULL,
    MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `body` VARCHAR(191) NULL,
    MODIFY `createdAtMs` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `states` MODIFY `stateCode` VARCHAR(191) NOT NULL,
    MODIFY `stateName` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user_credentials` MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `password` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user_profiles` MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `fullName` VARCHAR(191) NOT NULL,
    MODIFY `address1` VARCHAR(191) NOT NULL,
    MODIFY `address2` VARCHAR(191) NULL,
    MODIFY `city` VARCHAR(191) NOT NULL,
    MODIFY `state` VARCHAR(191) NOT NULL,
    MODIFY `zipCode` VARCHAR(191) NOT NULL,
    MODIFY `preferences` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `volunteer_history` MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `participationStatus` VARCHAR(191) NOT NULL,
    MODIFY `feedback` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user_credentials`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteer_history` ADD CONSTRAINT `volunteer_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_volunteerId_fkey` FOREIGN KEY (`volunteerId`) REFERENCES `user_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `notices_volunteerId_fkey` FOREIGN KEY (`volunteerId`) REFERENCES `user_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;
