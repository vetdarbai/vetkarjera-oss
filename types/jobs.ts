export interface JobFullDescription {
  about: string;
  jobDescription: string;
  responsibilities: string[];
  requirements: string[];
  weOffer: string[];
  conditions: string[];
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  address?: string;
  salary: string;
  salaryFrom?: number;
  salaryTo?: number;
  type: string;
  postedDate: string;
  postedDaysAgo: number;
  specialization: string;
  sector: string;
  description: string;
  tags: string[];
  fullDescription: JobFullDescription;
}
