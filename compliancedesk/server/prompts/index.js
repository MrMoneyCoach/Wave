import { sjpSystemPrompt } from './sjp.js';
import { independentSystemPrompt } from './independent.js';
import { quilterSystemPrompt } from './quilter.js';
import { openworkSystemPrompt } from './openwork.js';
import { sesameSystemPrompt } from './sesame.js';

export const NETWORKS = {
  sjp: { label: "St. James's Place", systemPrompt: sjpSystemPrompt, available: true },
  independent: { label: 'Independent (FCA Direct Authorised)', systemPrompt: independentSystemPrompt, available: true },
  quilter: { label: 'Quilter', systemPrompt: quilterSystemPrompt, available: false },
  openwork: { label: 'Openwork', systemPrompt: openworkSystemPrompt, available: false },
  sesame: { label: 'Sesame', systemPrompt: sesameSystemPrompt, available: false },
};

export function getSystemPromptForNetwork(networkKey) {
  const entry = NETWORKS[networkKey] || NETWORKS.independent;
  return entry.systemPrompt;
}

export function buildUserPrompt(formData, profile) {
  const lines = [];
  lines.push('Using the following client information, write a complete suitability letter.');
  lines.push('The letter must be personalised, specific to the client\'s circumstances, and ready to send. Do not include any placeholder text — write the full letter.');
  lines.push('');

  if (profile) {
    lines.push('--- Adviser / Firm Details ---');
    if (profile.adviser_name) lines.push(`Adviser name: ${profile.adviser_name}`);
    if (profile.firm_name) lines.push(`Firm name: ${profile.firm_name}`);
    if (profile.firm_fca_number) lines.push(`FCA reference number: ${profile.firm_fca_number}`);
    if (profile.network) lines.push(`Network: ${NETWORKS[profile.network]?.label || profile.network}`);
    lines.push('');
  }

  const sections = [
    ['Client Details', [
      ['Client full name', formData.clientName],
      ['Client age', formData.clientAge],
      ['Employment status', formData.employmentStatus],
      ['Marital status', formData.maritalStatus],
      ['Number of financial dependants', formData.dependants],
    ]],
    ['Financial Position', [
      ['Annual income (£)', formData.annualIncome],
      ['Total assets (£)', formData.totalAssets],
      ['Total liabilities (£)', formData.totalLiabilities],
      ['Monthly surplus income (£)', formData.monthlySurplus],
      ['Emergency fund in place', formData.emergencyFund],
    ]],
    ['Objectives', [
      ['Primary objective', formData.primaryObjective],
      ['Secondary objectives', formData.secondaryObjectives],
      ['Investment time horizon (years)', formData.timeHorizon],
      ['Attitude to risk (1–10)', formData.attitudeToRisk],
      ['Capacity for loss', formData.capacityForLoss],
    ]],
    ['Recommendation', [
      ['Product type', formData.productType],
      ['Specific product name', formData.productName],
      ['Recommended fund(s)', formData.recommendedFunds],
      ['Total amount to be invested/advised (£)', formData.totalAmount],
      ['Ongoing adviser charge', formData.ongoingCharge],
      ['Initial adviser charge', formData.initialCharge],
      ['Transfer from existing plan', formData.isTransfer],
      ['Ceding provider name', formData.cedingProvider],
    ]],
    ['Vulnerability Assessment', [
      ['Vulnerability factors identified', formData.vulnerabilityIdentified],
      ['Vulnerability description', formData.vulnerabilityDescription],
    ]],
    ['Key Risks Discussed', [
      ['Risks discussed with client', Array.isArray(formData.risksDiscussed) ? formData.risksDiscussed.join(', ') : formData.risksDiscussed],
    ]],
  ];

  for (const [heading, fields] of sections) {
    lines.push(`--- ${heading} ---`);
    for (const [label, value] of fields) {
      if (value === undefined || value === null || value === '') continue;
      lines.push(`${label}: ${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
