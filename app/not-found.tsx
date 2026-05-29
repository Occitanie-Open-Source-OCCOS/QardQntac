"use client";

import { NextResponse } from "next/server";

export default function NotFound() {
	return NextResponse.json({ error: 404 });
}
