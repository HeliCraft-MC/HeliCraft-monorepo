import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback } from 'react';
import type { ReactElement, ChangeEvent } from 'react';
import { WorkspaceNavigation } from './workspace-navigation';
import { WorkspaceContent } from './workspace-content';
import { ActionPanel } from './action-panel';
import { PageHeader } from './page-header';
import { WorkspaceLayout } from './workspace-layout';
import { WorkflowLayout } from './workflow-layout';
import { Dialog } from '../Dialog/dialog';
import { StepNavigation } from './step-navigation';
import { Icon } from '../icon';
import { Button } from '../Button/button';
import { TextField } from '../TextField/text-field';
import { FormField } from '../FormField/form-field';

const meta = {
  title: 'Patterns/Workspaces',
  component: WorkspaceNavigation,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared workspaces for account, state, company and administration screens. Navigation uses ordinary links and aria-current; below 60rem it becomes a labelled disclosure showing the current section. ActionPanel keeps draft controls mounted while collapsed and expands invalid native controls. WorkspaceContent gives protected pages a consistent spacing rhythm. StepNavigation uses buttons to revisit editor stages without submitting or discarding fields. Supply translated labels and actual capability-filtered links.',
      },
    },
  },
} satisfies Meta<typeof WorkspaceNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Navigation: Story = {
  args: {
    label: 'Company sections',
    currentLabel: 'Overview',
    children: (
      <>
        <a href="#overview" aria-current="page">
          <Icon name="overview" />
          Overview
        </a>
        <a href="#finance">
          <Icon name="wallet" />
          Finance
        </a>
        <a href="#governance">
          <Icon name="governance" />
          Government and offices with a long translated label
        </a>
        <a href="#history">
          <Icon name="history" />
          History
        </a>
      </>
    ),
  },
};
export const Mobile: Story = {
  ...Navigation,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
function EditorStages(): ReactElement {
  const [value, setValue] = useState('content');
  const steps = [
    { id: 'content', label: 'Questions' },
    { id: 'settings', label: 'Settings' },
    { id: 'review', label: 'Review' },
  ];
  return <StepNavigation label="Create poll" steps={steps} value={value} onChange={setValue} />;
}
export const Stages: Story = { args: Navigation.args, render: EditorStages };
export const ActionsAndContent: Story = {
  args: Navigation.args,
  render: () => (
    <WorkspaceContent>
      <PageHeader
        title="Company finances"
        description="Review actual balances and prepare payments."
        actions={<Button tone="quiet">History</Button>}
      />
      <ActionPanel
        title="New payment"
        description="Prepare the amount and recipient, then review the exact debit."
      >
        <FormField label="Amount" htmlFor="workspace-amount">
          <TextField id="workspace-amount" inputMode="decimal" />
        </FormField>
        <Button>Review payment</Button>
      </ActionPanel>
      <p>No transactions yet. Received funds and completed payments will appear here.</p>
    </WorkspaceContent>
  ),
};

function StagedWorkflow(): ReactElement {
  const [value, setValue] = useState('identity');
  const [name, setName] = useState('Example draft');
  const changeName = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.currentTarget.value);
  }, []);
  const steps = [
    { id: 'identity', label: '1. Identity', group: 'Prepare' },
    { id: 'authority', label: '2. Authority', group: 'Prepare' },
    { id: 'review', label: '3. Review', group: 'Publish' },
  ];
  return (
    <WorkflowLayout label="Formation stages" steps={steps} value={value} onChange={setValue}>
      <h2>{steps.find((step) => step.id === value)?.label}</h2>
      {value === 'identity' ? (
        <FormField label="Draft name" htmlFor="story-draft-name">
          <TextField id="story-draft-name" value={name} onChange={changeName} />
        </FormField>
      ) : (
        <p>The host preserves the draft: {name}. Review saved information before publishing.</p>
      )}
    </WorkflowLayout>
  );
}
export const Workflow: Story = { args: Navigation.args, render: StagedWorkflow };
export const MobileWorkflow: Story = { ...Workflow, globals: Mobile.globals };
export const EntityTheme: Story = {
  args: Navigation.args,
  render: () => (
    <WorkspaceLayout accent="#4788bd">
      <WorkspaceNavigation label="State institutions" currentLabel="Currency">
        <a href="#currency" aria-current="page">
          Currency
        </a>
        <a href="#taxes">Taxes</a>
      </WorkspaceNavigation>
      <WorkspaceContent>
        <PageHeader
          title="Currency"
          description="All state tools and dialog surfaces share the state color."
        />
        <ActionPanel title="Prepare a change">
          <p>Short content keeps its natural height.</p>
          <Dialog title="Review currency" trigger="Review" closeLabel="Close">
            <p>The portalled dialog retains this workspace theme.</p>
          </Dialog>
        </ActionPanel>
      </WorkspaceContent>
    </WorkspaceLayout>
  ),
};
