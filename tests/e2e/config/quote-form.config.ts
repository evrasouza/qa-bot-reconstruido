export type QuoteFormConfig = {
  name: string;
  baseURL: string;
  localePath: string;
  quotePath: string;
  expectedHeading: RegExp;
  successMessage: RegExp;
  testData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    postalCode: string;
  };
};

export const quoteFormConfigs: QuoteFormConfig[] = [
  {
    name: 'ski-doo-ca-en',
    baseURL: 'https://ski-doo.brp.com',
    localePath: '/ca/en',
    quotePath: '/shopping-tools/get-a-quote.html',
    expectedHeading: /get a quote/i,
    successMessage: /thank you|submitted|request received|dealer will contact you/i,
    testData: {
      firstName: 'Everton',
      lastName: 'Silva',
      email: 'everton.qa@example.com',
      phone: '5551234567',
      postalCode: 'H2H2H2'
    }
  }
];
