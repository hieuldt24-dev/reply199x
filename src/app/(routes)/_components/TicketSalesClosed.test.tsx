// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketSalesClosed } from "./TicketSalesClosed";

describe("TicketSalesClosed", () => {
  it("renders the closed label without a button", () => {
    render(<TicketSalesClosed className="reply-action" />);
    const label = screen.getByRole("status");
    expect(label).toHaveTextContent("Đã đóng đặt phiếu nước");
    expect(label).toHaveClass("reply-action");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
