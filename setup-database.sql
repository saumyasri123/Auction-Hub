-- Database schema setup for AuctionHub
-- This script creates all necessary tables for the auction platform

-- Drop existing tables if they exist
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS counter_offers CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auctions table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  starting_price DECIMAL(10,2) NOT NULL,
  bid_increment DECIMAL(10,2) NOT NULL,
  go_live_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('scheduled', 'live', 'ended', 'closed', 'accepted', 'rejected', 'counter_pending', 'counter_accepted', 'counter_rejected')),
  highest_bid_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  bidder_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Counter offers table
CREATE TABLE IF NOT EXISTS counter_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  bidder_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE auctions ADD CONSTRAINT fk_auctions_seller_id FOREIGN KEY (seller_id) REFERENCES users(id);
ALTER TABLE auctions ADD CONSTRAINT fk_auctions_highest_bid_id FOREIGN KEY (highest_bid_id) REFERENCES bids(id);
ALTER TABLE bids ADD CONSTRAINT fk_bids_auction_id FOREIGN KEY (auction_id) REFERENCES auctions(id);
ALTER TABLE bids ADD CONSTRAINT fk_bids_bidder_id FOREIGN KEY (bidder_id) REFERENCES users(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE counter_offers ADD CONSTRAINT fk_counter_offers_auction_id FOREIGN KEY (auction_id) REFERENCES auctions(id);
ALTER TABLE counter_offers ADD CONSTRAINT fk_counter_offers_seller_id FOREIGN KEY (seller_id) REFERENCES users(id);
ALTER TABLE counter_offers ADD CONSTRAINT fk_counter_offers_bidder_id FOREIGN KEY (bidder_id) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_auction_id FOREIGN KEY (auction_id) REFERENCES auctions(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_buyer_id FOREIGN KEY (buyer_id) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_seller_id FOREIGN KEY (seller_id) REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_go_live_at ON auctions(go_live_at);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_auction_id ON counter_offers(auction_id);