-- Block 9a: AI-disclosure flag on Pat-drafted notifications.
ALTER TABLE "Notification" ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
