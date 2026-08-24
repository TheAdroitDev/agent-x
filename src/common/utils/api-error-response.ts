import { NextResponse } from "next/server";
import { ApiErrorResponse } from "@/common/types";

export function errorResponse(
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  status = 500,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
    },
    { status }
  );
}
