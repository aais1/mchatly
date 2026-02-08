import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import { PushSubscription } from '@/lib/models/PushSubscription';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }
    
    // Upsert subscription
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { 
        endpoint: subscription.endpoint,
        keys: subscription.keys, 
        createdAt: new Date() 
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


