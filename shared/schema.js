import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  decimal,
  integer,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["buyer", "seller", "admin"]);
export const auctionStatusEnum = pgEnum("auction_status", [
  "scheduled",
  "live",
  "ended",
  "closed",
  "accepted",
  "rejected",
  "counter_pending",
  "counter_accepted",
  "counter_rejected",
]);
export const counterOfferStatusEnum = pgEnum("counter_offer_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("buyer"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auctions = pgTable("auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  itemName: text("item_name").notNull(),
  description: text("description").notNull(),
  startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull(),
  bidIncrement: decimal("bid_increment", { precision: 10, scale: 2 }).notNull(),
  goLiveAt: timestamp("go_live_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: auctionStatusEnum("status").notNull().default("scheduled"),
  highestBidId: varchar("highest_bid_id").references(() => bids.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").references(() => auctions.id).notNull(),
  bidderId: varchar("bidder_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  meta: jsonb("meta"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const counterOffers = pgTable("counter_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").references(() => auctions.id).notNull(),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  bidderId: varchar("bidder_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: counterOfferStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").references(() => auctions.id).notNull(),
  buyerId: varchar("buyer_id").references(() => users.id).notNull(),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  pdfUrl: text("pdf_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod insert schemas (keep if you validate inputs in JS)
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  role: true,
  passwordHash: true,
});

export const insertAuctionSchema = createInsertSchema(auctions).pick({
  sellerId: true,
  itemName: true,
  description: true,
  startingPrice: true,
  bidIncrement: true,
  goLiveAt: true,
  durationMinutes: true,
});

export const insertBidSchema = createInsertSchema(bids).pick({
  auctionId: true,
  bidderId: true,
  amount: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  message: true,
  meta: true,
});

export const insertCounterOfferSchema = createInsertSchema(counterOffers).pick({
  auctionId: true,
  sellerId: true,
  bidderId: true,
  amount: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  auctionId: true,
  buyerId: true,
  sellerId: true,
  totalAmount: true,
  pdfUrl: true,
});

// Note: TypeScript-only type exports removed.
