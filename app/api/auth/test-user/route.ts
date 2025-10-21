import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { api } from '@/convex/_generated/api';

export async function GET() {
  try {
    // Create a fresh Convex client for each request to avoid state persistence
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    console.log('🚀 API Route - Starting authentication check');

    // Get the auth token using the proper Convex Auth Next.js server function
    const authToken = await convexAuthNextjsToken();

    console.log('🔍 API Route - Auth token:', authToken ? 'Present' : 'Missing');
    console.log('🔍 JWT Token value (first 20 chars):', authToken ? authToken.substring(0, 20) + '...' : 'None');

    // If no auth token, return immediately - user is not authenticated
    if (!authToken) {
      console.log('👤 No auth token - returning not authenticated');
      return NextResponse.json(
        {
          success: false,
          message: 'No authenticated user found',
          user: null,
          debug: {
            hasAuthToken: false,
            authTokenLength: 0,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 401 }
      );
    }

    // Set auth token for Convex client
    convex.setAuth(authToken);

    // Query the current user using Convex
    const currentUser = await convex.query(api.users.currentUser);

    console.log('👤 Current user query result:', currentUser ? 'User found' : 'No user');

    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No authenticated user found',
          user: null,
          debug: {
            hasAuthToken: !!authToken,
            authTokenLength: authToken ? authToken.length : 0,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 401 }
      );
    }

    // Return user information (excluding sensitive data)
    const userInfo = {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      isEmailVerified: !!currentUser.emailVerificationTime,
      emailVerificationTime: currentUser.emailVerificationTime,
      createdAt: currentUser._creationTime,
      phone: currentUser.phone,
      image: currentUser.image,
      isActive: true, // Default to true if not set
      // Add any other non-sensitive fields you want to expose
    };

    return NextResponse.json({
      success: true,
      message: 'User authenticated successfully',
      user: userInfo,
      debug: {
        hasAuthToken: !!authToken,
        authTokenLength: authToken ? authToken.length : 0,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ API Route Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
