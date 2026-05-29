import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
  messages: {
    copyright: string;
  };
}

export default function Layout({ preview, children, messages }: LayoutProps) {
  return (
    <Html>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "#a600bb",
                foreground: "#111111",
                secondary: "#71717a",
                background: "#f4f4f4",
                border: "#e5e7eb",
              },
              borderRadius: {
                "2xl": "1.25rem",
                xl: "0.75rem",
                lg: "0.625rem",
              },
            },
          },
        }}
      >
        <Head />
        <Preview>{preview}</Preview>

        <Body className="bg-background font-sans py-12 px-4">
          <Container className="max-w-[600px] mx-auto">
            <Section className="bg-white p-8 md:p-12 border border-border rounded-2xl">
              {children}
            </Section>

            <Section className="mt-8 text-center px-4">
              <Text className="text-secondary text-xs font-medium">
                {messages.copyright}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
