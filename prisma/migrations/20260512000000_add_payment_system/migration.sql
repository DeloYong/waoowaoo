-- CreateTable
CREATE TABLE `PaymentOrder` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY',
    `credits` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paymentMethod` VARCHAR(191) NULL,
    `paymentChannel` VARCHAR(191) NULL,
    `thirdPartyOrderId` VARCHAR(255) NULL,
    `paidAt` DATETIME(3) NULL,
    `expiredAt` DATETIME(3) NOT NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundAmount` DECIMAL(10, 2) NULL,
    `metadata` JSON NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentOrder_orderNo_key`(`orderNo`),
    INDEX `PaymentOrder_userId_idx`(`userId`),
    INDEX `PaymentOrder_status_idx`(`status`),
    INDEX `PaymentOrder_thirdPartyOrderId_idx`(`thirdPartyOrderId`),
    INDEX `PaymentOrder_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RechargePackage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `credits` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `originalPrice` DECIMAL(10, 2) NULL,
    `bonusCredits` INTEGER NOT NULL DEFAULT 0,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RechargePackage_isActive_idx`(`isActive`),
    INDEX `RechargePackage_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentOrder` ADD CONSTRAINT `PaymentOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default recharge packages
INSERT INTO `RechargePackage` (`id`, `name`, `credits`, `price`, `originalPrice`, `bonusCredits`, `isPopular`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('pkg_001', '基础套餐', 1000, 9.90, NULL, 0, false, true, 1, NOW(), NOW()),
('pkg_002', '标准套餐', 5000, 49.00, 59.00, 500, true, true, 2, NOW(), NOW()),
('pkg_003', '专业套餐', 10000, 99.00, 119.00, 2000, true, true, 3, NOW(), NOW()),
('pkg_004', '企业套餐', 50000, 499.00, 599.00, 15000, false, true, 4, NOW(), NOW()),
('pkg_005', '旗舰套餐', 100000, 999.00, 1199.00, 40000, false, true, 5, NOW(), NOW());
