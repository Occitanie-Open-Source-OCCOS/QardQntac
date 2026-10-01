export interface PhoneNumber {
  number: string;
  label: string;
}

export interface ContactData {
  name: string;
  firstname: string;
  lastname: string;
  title: string;
  company: string;
  email: string;
  phones: PhoneNumber[];
  website: string;
  address: string;
}

export function emptyContact(): ContactData {
  return {
    name: "",
    firstname: "",
    lastname: "",
    title: "",
    company: "",
    email: "",
    phones: [],
    website: "",
    address: "",
  };
}

export interface AddressBook {
  href: string;
  name: string;
}
