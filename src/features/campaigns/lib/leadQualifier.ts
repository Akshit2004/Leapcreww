export interface LeadQualifierQuestion {
  id: string;
  text: string;
  options: string[];
  attributeKey: string;
  disqualifyOn?: string[];
}

export interface LeadQualifierConfig {
  enabled: boolean;
  triggerKeyword: string;
  questions: LeadQualifierQuestion[];
  qualifiedTag: string;
  disqualifiedTag: string;
}
