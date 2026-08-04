# Database ER Diagram — Supplier Service

This module manages supplier profiles, contacts, audits findings, performance scorecards, certifications and quality records, issues log, and the Approved Supplier List (ASL).

```mermaid
erDiagram
    suppliers {
        uuid id PK
        uuid tenant_id FK
        string supplier_code
        string name
        string legal_name
        string supplier_type
        string category
        string risk_level
        string primary_contact_name
        string primary_contact_email
        string primary_contact_phone
        string website
        string address_line1
        string address_line2
        string city
        string state
        string country
        string postal_code
        string tax_id
        string duns_number
        string status
        date approved_date
        date expiry_date
        boolean quality_agreement_signed
        date quality_agreement_date
        date last_audit_date
        date next_audit_date
        jsonb certifications
        decimal current_score
        string score_grade
        text[] products_services
        uuid workflow_instance_id FK
        uuid project_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    supplier_contacts {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        string name
        string title
        string email
        string phone
        string mobile
        string contact_type
        boolean is_primary
        text notes
        timestamp created_at
    }

    supplier_audits {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        string audit_number
        string audit_type
        text audit_scope
        date scheduled_date
        date actual_date
        uuid lead_auditor_id FK
        jsonb audit_team
        string status
        integer findings_count
        integer major_findings
        integer minor_findings
        integer observations
        string overall_rating
        decimal score
        text executive_summary
        text strengths
        text weaknesses
        text recommendations
        boolean capa_required
        uuid capa_id FK
        date next_audit_date
        uuid workflow_instance_id FK
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    audit_findings {
        uuid id PK
        uuid audit_id FK
        uuid tenant_id FK
        integer finding_number
        string finding_type
        string category
        string clause_reference
        text description
        text evidence
        text supplier_response
        date response_date
        text verification_method
        uuid verified_by FK
        timestamp verified_at
        text verification_notes
        string status
        uuid capa_id FK
        timestamp created_at
    }

    supplier_scorecards {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        date period_start
        date period_end
        decimal quality_score
        decimal defect_rate
        decimal lot_acceptance_rate
        integer complaints_count
        decimal delivery_score
        decimal on_time_delivery_rate
        decimal lead_time_adherence
        decimal service_score
        decimal responsiveness_score
        decimal documentation_score
        decimal cost_score
        decimal price_competitiveness
        decimal overall_score
        string grade
        string trend
        text notes
        uuid calculated_by FK
        timestamp calculated_at
    }

    supplier_documents {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        string document_type
        string document_name
        string file_path
        bigint file_size
        string mime_type
        date issue_date
        date expiry_date
        string status
        uuid verified_by FK
        timestamp verified_at
        text notes
        uuid uploaded_by FK
        timestamp uploaded_at
    }

    supplier_issues {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        string issue_number
        string issue_type
        string severity
        text description
        text[] lot_numbers
        integer quantity_affected
        date identified_date
        date resolved_date
        string status
        text resolution
        uuid capa_id FK
        uuid created_by FK
        timestamp created_at
    }

    approved_supplier_list {
        uuid id PK
        uuid supplier_id FK
        uuid tenant_id FK
        string material_category
        text[] material_codes
        text approval_scope
        text restrictions
        date approved_date
        date expiry_date
        date review_date
        string status
        uuid approved_by FK
        uuid signature_id
        text notes
        timestamp created_at
    }

    tenants ||--o{ suppliers : "qualifies"
    suppliers ||--o{ supplier_contacts : "has_contact"
    suppliers ||--o{ supplier_audits : "audited"
    users ||--o{ supplier_audits : "leads"
    supplier_audits ||--o{ audit_findings : "finds"
    users ||--o{ audit_findings : "verifies_finding"
    suppliers ||--o{ supplier_scorecards : "scored"
    suppliers ||--o{ supplier_documents : "attaches"
    suppliers ||--o{ supplier_issues : "experiences"
    suppliers ||--o{ approved_supplier_list : "approved_on"
```
