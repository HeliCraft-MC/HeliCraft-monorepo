ALTER TABLE "financial_accounts" DROP CONSTRAINT "financial_account_kind";--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD COLUMN "company_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_company_decision_id_unique" UNIQUE("company_decision_id");--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_account_kind" CHECK ("financial_accounts"."kind" in ('PLAYER','COMPANY','CENTRAL_BANK','TREASURY','ISSUANCE'));