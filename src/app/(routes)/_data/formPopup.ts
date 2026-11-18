// Check-in Google Forms opened from the Navbar "Check in" group. Add a form = append one entry.
export const CHECKIN_GROUP_LABEL = "Check in";

export type CheckinForm = Readonly<{
  id: string;
  menuLabel: string;
  dialogTitle: string;
  embedUrl: string;
  fallbackUrl: string;
}>;

type CheckinFormInput = Readonly<{ id: string; menuLabel: string; dialogTitle: string; googleFormId: string }>;

function googleForm({ id, menuLabel, dialogTitle, googleFormId }: CheckinFormInput): CheckinForm {
  const base = `https://docs.google.com/forms/d/e/${googleFormId}/viewform`;
  return Object.freeze({ id, menuLabel, dialogTitle, embedUrl: `${base}?embedded=true`, fallbackUrl: base });
}

export const checkinForms: readonly CheckinForm[] = Object.freeze([
  // Owner short link: https://forms.gle/j8bUG4KqMMDQKfL27
  googleForm({
    id: "check-in-hoai-niem",
    menuLabel: "Check in không gian âm nhạc hoài niệm",
    dialogTitle: "Check in không gian âm nhạc hoài niệm",
    googleFormId: "1FAIpQLSdTYWn8MFgQyPY67ixOfxkykYNBtL1Y-gTNRqBvVcs5SYcuog",
  }),
  // Owner short link: https://forms.gle/W4rPWP6rckzRFPkH9
  googleForm({
    id: "checkin-popup",
    menuLabel: "Checkin popup",
    dialogTitle: "Check in pop-up REPLY 199X",
    googleFormId: "1FAIpQLSfkPApNK9sU_GIXVe5Mh4t2HYTEfwQwYHaHJCMmDjx9iETRtw",
  }),
]);
