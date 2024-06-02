
// If succeeded
export type SuccessResponse = {
    next_cursor: string;
    tweets: Tweet[];
};

export type Tweet = {
    tweet_created_at: string;
    id_str: string;
    text: null | string;
    full_text: string;
    source: string;
    truncated: boolean;
    in_reply_to_status_id_str: string | null;
    in_reply_to_user_id_str: string;
    in_reply_to_screen_name: string;
    user: User;
    quoted_status_id_str: string | null;
    is_quote_status: boolean;
    quoted_status: null;
    retweeted_status: null;
    quote_count: number;
    reply_count: number;
    retweet_count: number;
    favorite_count: number;
    lang: string;
    entities: {
        user_mentions: UserMention[];
        urls: unknown[]; // You may want to define a type for URLs
        hashtags: unknown[]; // You may want to define a type for hashtags
        symbols: unknown[]; // You may want to define a type for symbols
    };
    views_count: number;
    bookmark_count: number;
};

export type User = {
    id_str: string;
    name: string;
    screen_name: string;
    location: string;
    url: null;
    description: string;
    protected: boolean;
    verified: boolean;
    followers_count: number;
    friends_count: number;
    listed_count: number;
    favourites_count: number;
    statuses_count: number;
    created_at: string;
    profile_banner_url: string;
    profile_image_url_https: string;
    can_dm: boolean;
};

export type UserMention = {
    id_str: string;
    name: string;
    screen_name: string;
    indices: [number, number];
};

// If failed
export type ErrorResponse = {
    status: "error";
    message: string;
};