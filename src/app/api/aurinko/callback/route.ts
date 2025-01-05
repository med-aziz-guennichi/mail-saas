import { exchangeCodeForAccessToken, getAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from '@vercel/functions';
import axios from "axios";

export const GET = async (req: NextRequest) => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const params = req.nextUrl.searchParams;
    const status = params.get('status');
    // if (status !== 'success') return NextResponse.json({ message: "Failed to link account" }, { status: 400 });
    const code = params.get('code');
    if (!code) return NextResponse.json({ message: "No code provided" }, { status: 400 });
    const token = await exchangeCodeForAccessToken(code);
    if (!token) return NextResponse.json({ message: "Failed to exchange code for token" }, { status: 400 });
    const accountDetails = await getAccountDetails(token.accessToken);
    await db.account.upsert({
        where: {
            id: token.accountId.toString(),
        },
        update: {
            accessToken: token.accessToken,
        },
        create: {
            id: token.accountId.toString(),
            userId,
            emailAddress: accountDetails.email,
            name: accountDetails.name,
            accessToken: token.accessToken
        }
    });
    // trigger initial sync endpoint
    waitUntil(
        axios.post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, {
            accountId: token.accountId.toString(),
            userId
        }).then(response => {
            console.log('Initial sync triggered', response.data);
        }).catch(error => {
            console.error('Error triggering initial sync:', error);
        })
    )
    return NextResponse.redirect(new URL('/mail', req.url));
}


// http://localhost:3000/api/aurinko/callback?authuser=0&code=4%2F0AanRRrsKUDwdyHBtGl5cz6WcBYOlUsTewUIYpn4-KEQNB2DZZV7Buk1Go0M-0Uszy3Uoog&prompt=consent&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&state=eyJhbGciOiJIUzI1NiJ9.eyJzZXJ2aWNlVHlwZSI6Ikdvb2dsZSIsInJlc3BvbnNlVHlwZSI6ImNvZGUiLCJhcHBJZCI6MTUwNCwic2NvcGVzIjoiTWFpbC5SZWFkIE1haWwuUmVhZFdyaXRlIE1haWwuU2VuZCBNYWlsLkRyYWZ0cyBNYWlsLkFsbCIsInJldHVyblVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hcGkvYXVyaW5rby9jYWxsYmFjayIsImlhdCI6MTczNjA0MzI5NCwiZXhwIjoxNzM2MDQ1MDk0fQ.teTRUNvFe7V7c97m8OosgJh14PNPpwSJGuiDDYhVuPs