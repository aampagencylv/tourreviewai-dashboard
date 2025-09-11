-- Add Google OAuth fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_business_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oauth_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_google_sync_at TIMESTAMPTZ;

-- Create google_reviews table for storing Google Business Profile reviews
CREATE TABLE IF NOT EXISTS google_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_review_id TEXT UNIQUE NOT NULL,
    google_business_review_id TEXT, -- This is the ID needed for replies
    author_name TEXT,
    author_photo_url TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    review_datetime TIMESTAMPTZ,
    reply_comment TEXT,
    reply_datetime TIMESTAMPTZ,
    source TEXT DEFAULT 'google_business_profile',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_reviews_user_id ON google_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_google_review_id ON google_reviews(google_review_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON google_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_google_reviews_review_datetime ON google_reviews(review_datetime);

-- Enable Row Level Security (RLS)
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own Google reviews" ON google_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google reviews" ON google_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google reviews" ON google_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google reviews" ON google_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_google_reviews_updated_at 
    BEFORE UPDATE ON google_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON google_reviews TO authenticated;
GRANT USAGE ON SEQUENCE google_reviews_id_seq TO authenticated;

