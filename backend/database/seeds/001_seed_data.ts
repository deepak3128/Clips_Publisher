import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('notifications').del();
  await knex('publish_logs').del();
  await knex('schedules').del();
  await knex('videos').del();
  await knex('connected_accounts').del();
  await knex('users').del();

  // Insert test users
  const users = await knex('users').insert([
    {
      email: 'demo@autoshorts.com',
      name: 'Demo User',
      password: '$2b$10$Vf5VwG2K5L5Q5Q5Q5Q5Q5e5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', // hashed 'password123'
      google_id: null,
      meta_id: null,
    },
    {
      email: 'creator@autoshorts.com',
      name: 'Test Creator',
      password: '$2b$10$Vf5VwG2K5L5Q5Q5Q5Q5Q5e5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', // hashed 'password123'
      google_id: null,
      meta_id: null,
    },
  ]);

  const userId = users[0];
  const creatorId = users[1];

  // Insert connected accounts (mock)
  await knex('connected_accounts').insert([
    {
      user_id: userId,
      platform: 'youtube',
      access_token: 'mock_youtube_token_encrypted',
      refresh_token: 'mock_youtube_refresh_encrypted',
      expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      account_details: JSON.stringify({
        id: 'UC1234567890',
        name: 'My YouTube Channel',
        email: 'channel@gmail.com',
      }),
    },
    {
      user_id: userId,
      platform: 'instagram',
      access_token: 'mock_instagram_token_encrypted',
      refresh_token: null,
      expires_at: new Date(Date.now() + 5184000000), // 60 days from now
      account_details: JSON.stringify({
        id: '123456789',
        name: 'my_insta_handle',
        business_account_id: 'act_1234567890',
      }),
    },
  ]);

  // Insert sample videos
  const videos = await knex('videos').insert([
    {
      user_id: userId,
      title: 'Funny Pet Moments',
      caption: 'Hilarious pet videos compilation! 😂',
      hashtags: JSON.stringify(['pets', 'funny', 'comedy', 'viral']),
      file_url:
        'https://r2.example.com/videos/video-1-sample.mp4',
      file_name: 'pet-moments.mp4',
      file_size: 104857600, // 100MB
      status: 'draft',
      uploaded_at: new Date(),
    },
    {
      user_id: userId,
      title: 'Quick Cooking Hacks',
      caption: 'Try these amazing cooking tips at home!',
      hashtags: JSON.stringify(['cooking', 'hacks', 'tips', 'food']),
      file_url:
        'https://r2.example.com/videos/video-2-sample.mp4',
      file_name: 'cooking-hacks.mp4',
      file_size: 157286400, // 150MB
      status: 'scheduled',
      uploaded_at: new Date(Date.now() - 86400000), // Yesterday
    },
    {
      user_id: userId,
      title: 'Fitness Routine',
      caption: 'Easy 10-minute workout routine',
      hashtags: JSON.stringify(['fitness', 'workout', 'health', 'exercise']),
      file_url:
        'https://r2.example.com/videos/video-3-sample.mp4',
      file_name: 'fitness-routine.mp4',
      file_size: 209715200, // 200MB
      status: 'published',
      uploaded_at: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      user_id: creatorId,
      title: 'Gaming Highlights',
      caption: 'Best gaming moments from this week',
      hashtags: JSON.stringify(['gaming', 'highlights', 'esports', 'streamer']),
      file_url:
        'https://r2.example.com/videos/video-4-sample.mp4',
      file_name: 'gaming-highlights.mp4',
      file_size: 314572800, // 300MB
      status: 'draft',
      uploaded_at: new Date(),
    },
  ]);

  const videoId1 = videos[0];
  const videoId2 = videos[1];
  const videoId3 = videos[2];

  // Insert schedules
  await knex('schedules').insert([
    {
      video_id: videoId2,
      platform: 'youtube',
      publish_date: new Date(Date.now() + 86400000), // Tomorrow
      status: 'pending',
    },
    {
      video_id: videoId2,
      platform: 'instagram',
      publish_date: new Date(Date.now() + 86400000), // Tomorrow
      status: 'pending',
    },
    {
      video_id: videoId3,
      platform: 'youtube',
      publish_date: new Date(Date.now() - 86400000), // Yesterday
      status: 'published',
    },
    {
      video_id: videoId3,
      platform: 'instagram',
      publish_date: new Date(Date.now() - 86400000), // Yesterday
      status: 'published',
    },
  ]);

  // Insert publish logs (history)
  await knex('publish_logs').insert([
    {
      video_id: videoId3,
      platform: 'youtube',
      status: 'success',
      published_url: 'https://youtube.com/shorts/abc123xyz',
      error_message: null,
      retry_count: 0,
      published_at: new Date(Date.now() - 86400000),
    },
    {
      video_id: videoId3,
      platform: 'instagram',
      status: 'success',
      published_url: 'https://instagram.com/reel/abc123xyz',
      error_message: null,
      retry_count: 0,
      published_at: new Date(Date.now() - 86400000),
    },
    {
      video_id: videoId1,
      platform: 'youtube',
      status: 'failed',
      published_url: null,
      error_message: 'Invalid video format',
      retry_count: 1,
      published_at: new Date(Date.now() - 604800000), // 7 days ago
    },
  ]);

  // Insert notifications
  await knex('notifications').insert([
    {
      user_id: userId,
      type: 'success',
      channel: 'email',
      title: 'Video Published',
      message: 'Your video "Fitness Routine" was published successfully!',
      data: JSON.stringify({
        videoId: videoId3,
        platform: 'youtube',
      }),
      read: false,
      created_at: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      user_id: userId,
      type: 'warning',
      channel: 'in-app',
      title: 'Publish Failed',
      message:
        'Failed to publish "Funny Pet Moments" to YouTube. Check video format.',
      data: JSON.stringify({
        videoId: videoId1,
        platform: 'youtube',
        error: 'Invalid video format',
      }),
      read: true,
      created_at: new Date(Date.now() - 604800000), // 7 days ago
    },
    {
      user_id: userId,
      type: 'info',
      channel: 'email',
      title: 'Scheduled Publishing',
      message: 'Your video "Quick Cooking Hacks" is scheduled to publish tomorrow.',
      data: JSON.stringify({
        videoId: videoId2,
        platform: 'both',
      }),
      read: true,
      created_at: new Date(),
    },
  ]);

  console.log('Database seeded successfully with test data!');
}
