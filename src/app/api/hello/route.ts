import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function GET() {
  return NextResponse.json<ApiResponse<{ message: string }>>({
    data: { message: "Hello from EXE101!" },
  });
}
