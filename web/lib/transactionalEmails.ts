import { render } from "@react-email/render";
import { ConfirmSubscription } from "@/emails/ConfirmSubscription";
import { AlreadySubscribed } from "@/emails/AlreadySubscribed";
import { Welcome } from "@/emails/Welcome";

export async function renderConfirmSubscriptionEmail(props: {
  confirmUrl: string;
  unsubscribeUrl: string;
}): Promise<string> {
  return render(ConfirmSubscription(props));
}

export async function renderAlreadySubscribedEmail(props: {
  referralUrl: string;
  unsubscribeUrl: string;
}): Promise<string> {
  return render(AlreadySubscribed(props));
}

export async function renderWelcomeEmail(props: {
  referralUrl?: string;
  unsubscribeUrl: string;
}): Promise<string> {
  return render(Welcome(props));
}
