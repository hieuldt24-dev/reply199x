// Google Form opened from the Navbar popup. Change the label or URLs here only.
export const FORM_POPUP_LABEL = "Checkin popup";
export const FORM_POPUP_TITLE = "Biểu mẫu REPLY 199X";

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw/viewform";

export const formPopupLinks: Readonly<{ embed: string; fallback: string }> = Object.freeze({
  embed: `${FORM_URL}?embedded=true`,
  fallback: FORM_URL,
});
