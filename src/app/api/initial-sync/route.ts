import { Account } from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const { accountId, userId } = await req.json();
    if (!accountId || !userId) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    const dbAccount = await db.account.findUnique({
        where: {
            id: accountId,
            userId
        }
    });
    if (!dbAccount) return NextResponse.json({ message: "Account not found" }, { status: 404 });
    const account = new Account(dbAccount.accessToken);
    // performInitialSync
    const response = await account.performInitialSync();
    if (!response) {
        return NextResponse.json({ message: "Failed to perform initial sync" }, { status: 500 });
    }
    const { emails, deltaToken } = response;
    await db.account.update({
        where: {
            id: accountId,
        },
        data: {
            nextDeltaToken: deltaToken
        }
    });
    await syncEmailsToDatabase(emails, accountId);
    console.log('initial sync completed', deltaToken);
    return NextResponse.json({ success: true }, { status: 200 });
}