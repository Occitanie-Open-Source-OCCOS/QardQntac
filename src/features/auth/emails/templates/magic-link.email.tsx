import { Button, Heading, Hr, Section, Text } from "react-email";
import Layout from "@/features/emails/layouts/layout";

interface MagicLinkEmailProps {
  name: string;
  magicLink: string;
  messages: {
    preview: string;
    heading: string;
    greeting: string;
    waitingConfirmation: string;
    buttonLabel: string;
    fallbackLink: string;
    closing: string;
    teamPrefix: string;
  };
  layoutMessages: {
    copyright: string;
  };
}

export default function MagicLinkEmail({
  name,
  magicLink,
  messages,
  layoutMessages,
}: MagicLinkEmailProps) {
  return (
    <Layout preview={messages.preview} messages={layoutMessages}>
      <Heading className="text-3xl font-black tracking-tighter text-foreground mb-6">
        {messages.heading}
      </Heading>
      <Section className="mb-8">
        <Text className="text-foreground text-lg font-medium leading-relaxed mb-6">
          {name}, <br />
          {messages.greeting}
        </Text>
        <Text className="text-foreground/80 text-base mb-8">
          {messages.waitingConfirmation}
        </Text>
        <Section className="text-center mt-10 mb-10">
          <Button
            className="bg-primary text-white px-12 py-4 font-bold text-base"
            style={{ borderRadius: "48px" }}
            href={magicLink}
          >
            {messages.buttonLabel}
          </Button>
        </Section>
        <Text className="text-foreground/40 text-xs break-all text-center">
          {messages.fallbackLink} <br />
          <a href={magicLink} className="text-primary underline">
            {magicLink}
          </a>
        </Text>
      </Section>
      <Hr className="border-border my-8" />
      <Text className="text-foreground/60 text-sm mb-4">
        {messages.closing} <br />
        {messages.teamPrefix}
      </Text>
    </Layout>
  );
}
