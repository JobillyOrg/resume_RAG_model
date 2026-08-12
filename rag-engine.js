/**
 * Local RAG engine for ATS resume scoring & keyword extraction.
 * Zero API cost for: keyword extraction, ATS scoring, gap analysis.
 * Gemini is only needed for resume rewrite/boost.
 */
(function (global) {
  'use strict';

  // ─── SKILL / ATS KNOWLEDGE BASE (global job categories) ─────────
  const SKILL_KB = [
    // ── Software / Engineering ──
    { label: 'Python', terms: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'pytest', 'unittest', 'pip', 'poetry', 'celery'] },
    { label: 'JavaScript', terms: ['javascript', 'typescript', 'node.js', 'nodejs', 'react', 'react.js', 'redux', 'vue', 'angular', 'next.js', 'express', 'es6'] },
    { label: 'Java', terms: ['java', 'spring boot', 'spring mvc', 'spring security', 'spring', 'hibernate', 'jpa', 'maven', 'gradle', 'junit', 'mockito', 'microservices'] },
    { label: 'C#', terms: ['c#', 'csharp', '.net', 'asp.net', 'entity framework', 'dotnet', 'blazor', 'wpf'] },
    { label: 'Go', terms: ['golang', 'go '] },
    { label: 'Rust', terms: ['rust'] },
    { label: 'C++', terms: ['c++', 'cpp'] },
    { label: 'PHP', terms: ['php', 'laravel', 'symfony', 'wordpress'] },
    { label: 'Ruby', terms: ['ruby', 'rails', 'ruby on rails'] },
    { label: 'Scala', terms: ['scala', 'akka'] },
    { label: 'Kotlin', terms: ['kotlin', 'android kotlin'] },
    { label: 'Swift', terms: ['swift', 'swiftui', 'ios'] },
    { label: 'SQL', terms: ['sql', 'postgresql', 'mysql', 'oracle', 't-sql', 'pl/sql', 'sqlite', 'stored procedures', 'complex sql', 'ssis', 'ssrs'] },
    // Also add MongoDB / MSSQL as explicit labels for clearer DBA matching
    { label: 'MongoDB', terms: ['mongodb', 'mongo db', 'mongo'] },
    { label: 'MSSQL', terms: ['mssql', 'ms sql', 'microsoft sql server', 'sql server', 't-sql'] },
    { label: 'PowerShell', terms: ['powershell', 'pwsh', 'windows powershell'] },
    { label: 'MySQL', terms: ['mysql', 'mariadb'] },
    { label: 'NoSQL', terms: ['nosql', 'dynamodb', 'cassandra', 'redis', 'elasticsearch', 'cosmos db', 'neo4j'] },
    { label: 'AWS', terms: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'rds', 'eks', 'cloudformation', 'serverless', 'sagemaker', 'cloudwatch'] },
    { label: 'Azure', terms: ['azure', 'microsoft azure', 'azure devops', 'azure functions', 'event hubs', 'azure ml', 'bicep', 'aks'] },
    { label: 'GCP', terms: ['gcp', 'google cloud', 'bigquery', 'cloud run', 'gke', 'pubsub'] },
    { label: 'Docker', terms: ['docker', 'containerization', 'containers', 'dockerfile'] },
    { label: 'Kubernetes', terms: ['kubernetes', 'k8s', 'helm', 'eks', 'aks', 'gke', 'yaml manifests'] },
    { label: 'CI/CD', terms: ['ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'azure devops', 'continuous integration', 'continuous deployment', 'argo cd'] },
    { label: 'Terraform', terms: ['terraform', 'infrastructure as code', 'iac', 'azure bicep', 'pulumi', 'ansible', 'chef', 'puppet'] },
    { label: 'Machine Learning', terms: ['machine learning', 'ml', 'deep learning', 'neural network', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'xgboost', 'hyperparameter tuning', 'feature engineering', 'computer vision', 'opencv'] },
    { label: 'LLM', terms: ['llm', 'llms', 'large language model', 'gpt', 'chatgpt', 'openai', 'openai api', 'claude', 'gemini', 'prompt engineering'] },
    { label: 'RAG', terms: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation', 'rag pipeline', 'rag architecture', 'vector embeddings for rag'] },
    { label: 'LangChain', terms: ['langchain', 'langgraph', 'llamaindex', 'haystack'] },
    { label: 'NLP', terms: ['nlp', 'natural language processing', 'spacy', 'hugging face', 'transformers', 'bert', 'tokenization', 'named entity recognition'] },
    { label: 'AI Engineer', terms: ['ai engineer', 'ml engineer', 'machine learning engineer', 'ai/ml', 'ai assisted development', 'generative ai'] },
    { label: 'MLOps', terms: ['mlops', 'model deployment', 'model serving', 'feature store', 'model monitoring', 'mlflow', 'kubeflow'] },
    { label: 'AutoGen', terms: ['autogen', 'multi-agent', 'agentic ai', 'ai agents', 'crewai'] },
    { label: 'Code Generation', terms: ['code generation', 'github copilot', 'copilot', 'ai code assistant', 'cursor ide'] },
    { label: 'Data Engineering', terms: ['data engineering', 'etl', 'elt', 'data pipeline', 'apache spark', 'spark', 'hadoop', 'databricks', 'airflow', 'dbt', 'data modeling', 'kafka streams'] },
    { label: 'Data Scientist', terms: ['data scientist', 'data science', 'statistical modeling', 'shap', 'lime', 'a/b testing', 'experimentation'] },
    { label: 'Data Analyst', terms: ['data analyst', 'data analysis', 'excel', 'pivot tables', 'vlookup', 'power query', 'sql reporting'] },
    { label: 'Power BI', terms: ['power bi', 'tableau', 'looker', 'qlik', 'data visualization', 'dashboarding'] },
    { label: 'Snowflake', terms: ['snowflake', 'data warehouse', 'redshift', 'bigquery', 'synapse'] },
    { label: 'Kafka', terms: ['kafka', 'apache kafka', 'event streaming', 'message queue', 'rabbitmq', 'jms', 'sqs', 'pubsub'] },
    { label: 'REST API', terms: ['rest api', 'restful', 'rest apis', 'graphql', 'grpc', 'api design', 'web services', 'high-concurrency', 'microservices', 'soap'] },
    { label: 'Cloud Architecture', terms: ['cloud architecture', 'solution architect', 'system design', 'event-driven', 'enterprise architecture'] },
    { label: 'Dependency Injection', terms: ['dependency injection', 'ioc', 'inversion of control'] },
    { label: 'HTML/CSS', terms: ['html', 'html5', 'css', 'css3', 'responsive design', 'bootstrap', 'tailwind', 'websocket', 'sass', 'figma to code'] },
    { label: 'Mobile Development', terms: ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'xamarin', 'mobile app'] },
    { label: 'Game Development', terms: ['unity', 'unreal engine', 'game design', 'c# unity', 'godot'] },
    { label: 'Embedded Systems', terms: ['embedded', 'firmware', 'rtos', 'arduino', 'raspberry pi', 'iot', 'plc programming'] },
    { label: 'Blockchain', terms: ['blockchain', 'solidity', 'ethereum', 'smart contracts', 'web3', 'cryptocurrency'] },
    { label: 'Agile', terms: ['agile', 'scrum', 'safe', 'kanban', 'sprint', 'jira', 'confluence', 'sprint planning'] },
    { label: 'DevOps', terms: ['devops', 'site reliability', 'sre', 'observability', 'prometheus', 'grafana', 'elk', 'splunk', 'datadog', 'new relic'] },
    { label: 'Testing', terms: ['unit testing', 'integration testing', 'qa', 'test automation', 'pytest', 'jest', 'selenium', 'cypress', 'playwright', 'testng', 'junit', 'manual testing', 'uat'] },
    { label: 'Cybersecurity', terms: ['cybersecurity', 'information security', 'oauth', 'jwt', 'encryption', 'penetration testing', 'soc 2', 'sox', 'iso 27001', 'siem', 'firewall', 'vulnerability assessment', 'zero trust'] },
    { label: 'Linux', terms: ['linux', 'bash', 'shell scripting', 'unix', 'powershell', 'windows server'] },
    { label: 'Git', terms: ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'svn'] },
    { label: 'Networking', terms: ['networking', 'tcp/ip', 'dns', 'vpn', 'lan', 'wan', 'cisco', 'routing', 'switching', 'firewall', 'load balancer'] },
    { label: 'IT Support', terms: ['it support', 'help desk', 'desktop support', 'active directory', 'office 365', 'microsoft 365', 'hardware support', 'ticketing', 'service now', 'servicenow'] },
    { label: 'ITIL', terms: ['itil', 'service desk', 'incident management', 'change management', 'problem management', 'service management'] },
    { label: 'SAP', terms: ['sap', 's/4hana', 'abap', 'sap mm', 'sap sd', 'sap fi', 'sap hana'] },
    { label: 'SAP Fiori', terms: ['fiori', 'sap ui5'] },
    { label: 'Salesforce', terms: ['salesforce', 'apex', 'lightning', 'sales cloud', 'service cloud', 'soql'] },
    { label: 'Oracle ERP', terms: ['oracle erp', 'oracle ebs', 'oracle fusion', 'peoplesoft'] },
    { label: 'Microsoft Dynamics', terms: ['dynamics 365', 'dynamics crm', 'dynamics ax', 'navision'] },
    { label: 'Software Engineer', terms: ['software engineer', 'software developer', 'full stack', 'full-stack', 'backend engineer', 'frontend engineer', 'platform engineer'] },
    { label: 'QA Engineer', terms: ['qa engineer', 'quality assurance', 'sdet', 'test engineer', 'automation engineer'] },
    { label: 'Business Analyst', terms: ['business analyst', 'requirements gathering', 'user stories', 'business requirements', 'process mapping', 'gap analysis'] },
    { label: 'Product Manager', terms: ['product manager', 'product owner', 'roadmap', 'backlog grooming', 'go-to-market', 'okrs'] },
    { label: 'Project Management', terms: ['project management', 'pmp', 'prince2', 'stakeholder management', 'cross-functional', 'technical leadership', 'waterfall', 'risk management', 'ms project'] },
    { label: 'Program Management', terms: ['program manager', 'program management', 'portfolio management', 'epmo'] },
    { label: 'Scrum Master', terms: ['scrum master', 'agile coach', 'facilitation', 'retrospective'] },
    { label: 'Technical Writer', terms: ['technical writing', 'documentation', 'api documentation', 'knowledge base'] },
    { label: 'UI/UX Design', terms: ['ui/ux', 'ux design', 'ui design', 'figma', 'sketch', 'adobe xd', 'wireframing', 'prototyping', 'user research', 'usability testing', 'design systems'] },
    { label: 'Graphic Design', terms: ['graphic design', 'photoshop', 'illustrator', 'indesign', 'canva', 'branding', 'typography', 'adobe creative suite'] },
    { label: 'Video Production', terms: ['video editing', 'premiere pro', 'after effects', 'final cut', 'cinematography', 'motion graphics'] },
    { label: 'Content Writing', terms: ['content writing', 'copywriting', 'seo writing', 'blogging', 'editing', 'proofreading'] },
    // ── Business / Sales / Marketing ──
    { label: 'Sales', terms: ['sales', 'b2b sales', 'b2c sales', 'inside sales', 'outside sales', 'account executive', 'quota attainment', 'pipeline management', 'cold calling', 'negotiation'] },
    { label: 'Account Management', terms: ['account management', 'key account', 'customer success', 'retention', 'upsell', 'cross-sell', 'churn reduction'] },
    { label: 'Business Development', terms: ['business development', 'partnerships', 'lead generation', 'market expansion'] },
    { label: 'CRM', terms: ['crm', 'hubspot', 'salesforce crm', 'zoho crm', 'pipedrive'] },
    { label: 'Digital Marketing', terms: ['digital marketing', 'seo', 'sem', 'ppc', 'google ads', 'facebook ads', 'meta ads', 'social media marketing', 'email marketing', 'content marketing', 'affiliate marketing'] },
    { label: 'Marketing Analytics', terms: ['google analytics', 'ga4', 'marketing analytics', 'conversion rate', 'attribution', 'mixpanel', 'amplitude'] },
    { label: 'Brand Marketing', terms: ['brand management', 'brand strategy', 'campaign management', 'market research', 'positioning'] },
    { label: 'Growth Marketing', terms: ['growth hacking', 'growth marketing', 'a/b testing', 'funnel optimization', 'lifecycle marketing'] },
    { label: 'Public Relations', terms: ['public relations', 'media relations', 'press releases', 'crisis communication', 'corporate communications'] },
    { label: 'Customer Service', terms: ['customer service', 'customer support', 'call center', 'zendesk', 'freshdesk', 'nps', 'csat', 'first call resolution'] },
    // ── Finance / Accounting ──
    { label: 'Accounting', terms: ['accounting', 'bookkeeping', 'gaap', 'ifrs', 'general ledger', 'accounts payable', 'accounts receivable', 'reconciliations', 'month-end close'] },
    { label: 'Financial Analysis', terms: ['financial analysis', 'financial modeling', 'forecasting', 'budgeting', 'variance analysis', 'fp&a', 'valuation', 'dcf'] },
    { label: 'Audit', terms: ['audit', 'internal audit', 'external audit', 'sox compliance', 'controls testing', 'risk assessment'] },
    { label: 'Taxation', terms: ['taxation', 'tax preparation', 'corporate tax', 'gst', 'vat', 'transfer pricing'] },
    { label: 'Investment Banking', terms: ['investment banking', 'm&a', 'due diligence', 'ipo', 'capital markets', 'pitch books'] },
    { label: 'Corporate Finance', terms: ['corporate finance', 'treasury', 'cash management', 'working capital', 'capex'] },
    { label: 'Risk Management', terms: ['risk management', 'credit risk', 'market risk', 'operational risk', 'basel', 'var'] },
    { label: 'FinTech', terms: ['fintech', 'payments', 'kyc', 'aml', 'fraud detection', 'open banking'] },
    { label: 'QuickBooks', terms: ['quickbooks', 'xero', 'sage', 'netsuite', 'sap fi'] },
    { label: 'CPA', terms: ['cpa', 'acca', 'cfa', 'cima', 'chartered accountant'] },
    // ── HR / People ──
    { label: 'Human Resources', terms: ['human resources', 'hr', 'hrbp', 'employee relations', 'hr policies', 'workforce planning'] },
    { label: 'Talent Acquisition', terms: ['talent acquisition', 'recruiting', 'sourcing', 'interviewing', 'ats', 'greenhouse', 'lever', 'workday recruiting'] },
    { label: 'Compensation Benefits', terms: ['compensation', 'benefits', 'payroll', 'total rewards', 'job evaluation'] },
    { label: 'Learning Development', terms: ['learning and development', 'training', 'instructional design', 'lms', 'onboarding'] },
    { label: 'HRIS', terms: ['hris', 'workday', 'bamboohr', 'adp', 'successfactors', 'oracle hcm'] },
    { label: 'Diversity Inclusion', terms: ['diversity', 'inclusion', 'dei', 'belonging', 'equal opportunity'] },
    // ── Operations / Supply Chain / Manufacturing ──
    { label: 'Operations Management', terms: ['operations management', 'process improvement', 'lean', 'six sigma', 'kaizen', 'kpi', 'sop'] },
    { label: 'Supply Chain', terms: ['supply chain', 'logistics', 'procurement', 'inventory management', 'demand planning', 's&op', 'warehousing', 'distribution'] },
    { label: 'Procurement', terms: ['procurement', 'purchasing', 'vendor management', 'rfp', 'contract negotiation', 'strategic sourcing'] },
    { label: 'Manufacturing', terms: ['manufacturing', 'production planning', 'cnc', 'assembly', 'quality control', 'oee', 'mes'] },
    { label: 'Quality Control', terms: ['quality control', 'quality assurance', 'iso 9001', 'six sigma', 'spc', 'root cause analysis', 'capa'] },
    { label: 'Lean Six Sigma', terms: ['lean six sigma', 'six sigma', 'black belt', 'green belt', 'dmaic', '5s'] },
    { label: 'Warehouse Management', terms: ['warehouse management', 'wms', 'forklift', 'inventory control', 'picking packing'] },
    { label: 'Transportation', terms: ['transportation', 'fleet management', 'freight', 'tms', 'last mile', 'shipping'] },
    // ── Healthcare / Life Sciences ──
    { label: 'Nursing', terms: ['nursing', 'registered nurse', 'rn', 'patient care', 'vital signs', 'medication administration', 'ehr', 'epic', 'cerner'] },
    { label: 'Clinical Research', terms: ['clinical research', 'clinical trials', 'gcp', 'protocol', 'informed consent', 'cra', 'crc'] },
    { label: 'Pharmacy', terms: ['pharmacy', 'pharmacist', 'pharmacology', 'dispensing', 'medication therapy'] },
    { label: 'Medical Coding', terms: ['medical coding', 'icd-10', 'cpt', 'hcpcs', 'medical billing', 'revenue cycle'] },
    { label: 'Healthcare Administration', terms: ['healthcare administration', 'hipaa', 'patient scheduling', 'medical office', 'claims processing'] },
    { label: 'Biotechnology', terms: ['biotechnology', 'pcr', 'cell culture', 'assay development', 'gmp', 'glp'] },
    { label: 'Pharmaceutical', terms: ['pharmaceutical', 'drug development', 'pharmacovigilance', 'regulatory affairs', 'fda'] },
    { label: 'Allied Health', terms: ['physical therapy', 'occupational therapy', 'radiology', 'sonography', 'respiratory therapy'] },
    // ── Education ──
    { label: 'Teaching', terms: ['teaching', 'curriculum development', 'lesson planning', 'classroom management', 'assessment', 'differentiated instruction'] },
    { label: 'Special Education', terms: ['special education', 'iep', 'inclusion', 'behavioral intervention'] },
    { label: 'Higher Education', terms: ['higher education', 'academic advising', 'research supervision', 'grant writing'] },
    { label: 'Instructional Design', terms: ['instructional design', 'e-learning', 'articulate', 'captivate', 'scorm'] },
    { label: 'EdTech', terms: ['edtech', 'learning management system', 'canvas', 'blackboard', 'moodle'] },
    // ── Legal / Compliance ──
    { label: 'Legal', terms: ['legal research', 'litigation', 'contract drafting', 'corporate law', 'compliance', 'paralegal', 'case management'] },
    { label: 'Contract Management', terms: ['contract management', 'contract negotiation', 'msa', 'nda', 'vendor contracts'] },
    { label: 'Regulatory Compliance', terms: ['regulatory compliance', 'gdpr', 'ccpa', 'aml', 'kyc', 'policy development'] },
    { label: 'Intellectual Property', terms: ['intellectual property', 'patents', 'trademarks', 'copyright'] },
    // ── Engineering (non-software) ──
    { label: 'Mechanical Engineering', terms: ['mechanical engineering', 'cad', 'solidworks', 'autocad', 'ansys', 'fea', 'thermodynamics', 'manufacturing drawings'] },
    { label: 'Electrical Engineering', terms: ['electrical engineering', 'circuit design', 'pcb', 'power systems', 'plc', 'scada', 'matlab', 'simulink'] },
    { label: 'Civil Engineering', terms: ['civil engineering', 'structural analysis', 'autocad civil', 'revit', 'construction management', 'surveying'] },
    { label: 'Chemical Engineering', terms: ['chemical engineering', 'process engineering', 'piping', 'heat transfer', 'mass balance'] },
    { label: 'Industrial Engineering', terms: ['industrial engineering', 'time study', 'ergonomics', 'facility layout', 'simulation'] },
    { label: 'Architecture', terms: ['revit', 'bim', 'building design', 'construction documents', 'autocad architecture'] },
    // ── Trades / Field ──
    { label: 'Electrical Trade', terms: ['electrician', 'wiring', 'conduit', 'nec', 'panel installation', 'troubleshooting electrical'] },
    { label: 'Plumbing', terms: ['plumbing', 'pipefitting', 'hvac', 'refrigeration', 'boiler'] },
    { label: 'Welding', terms: ['welding', 'mig', 'tig', 'arc welding', 'fabrication', 'blueprint reading'] },
    { label: 'Automotive', terms: ['automotive', 'diagnostics', 'ase', 'engine repair', 'brake systems', 'ev maintenance'] },
    { label: 'Construction', terms: ['construction', 'carpentry', 'site supervision', 'osha', 'blueprint reading', 'estimating'] },
    // ── Hospitality / Retail / Food ──
    { label: 'Hospitality', terms: ['hospitality', 'hotel management', 'front desk', 'guest services', 'reservations', 'opera pms'] },
    { label: 'Food Service', terms: ['food service', 'culinary', 'kitchen management', 'food safety', 'haccp', 'menu planning'] },
    { label: 'Retail', terms: ['retail', 'merchandising', 'pos', 'inventory', 'visual merchandising', 'store operations', 'loss prevention'] },
    { label: 'Event Management', terms: ['event planning', 'event management', 'conference coordination', 'vendor coordination'] },
    // ── Science / Research / Environment ──
    { label: 'Laboratory Science', terms: ['laboratory', 'lab technician', 'sample analysis', 'chromatography', 'spectroscopy', 'glp'] },
    { label: 'Environmental Science', terms: ['environmental science', 'environmental compliance', 'sustainability', 'esa', 'waste management', 'air quality'] },
    { label: 'Research Scientist', terms: ['research scientist', 'experimental design', 'publications', 'grant writing', 'peer review'] },
    // ── Real Estate / Insurance ──
    { label: 'Real Estate', terms: ['real estate', 'property management', 'leasing', 'appraisal', 'mls', 'closing'] },
    { label: 'Insurance', terms: ['insurance', 'underwriting', 'claims', 'actuarial', 'policy administration', 'risk assessment'] },
    // ── Soft / Cross-cutting ──
    { label: 'Communication', terms: ['communication', 'presentation skills', 'public speaking', 'stakeholder communication', 'written communication'] },
    { label: 'Leadership', terms: ['leadership', 'team leadership', 'mentoring', 'coaching', 'people management', 'conflict resolution'] },
    { label: 'Change Management', terms: ['change management', 'organizational change', 'prosci', 'adoption'] },
    { label: 'Customer Experience', terms: ['customer experience', 'cx', 'journey mapping', 'voice of customer'] },
    { label: 'Languages', terms: ['bilingual', 'multilingual', 'translation', 'interpretation', 'spanish', 'french', 'german', 'mandarin', 'hindi', 'arabic'] },
  ];

  /**
   * Skill families — if an anchor remains, keep related ecosystem skills from the original resume.
   */
  const SKILL_FAMILIES = {
    python: [
      'python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'pytest', 'unittest',
      'matplotlib', 'seaborn', 'jupyter', 'pip', 'poetry', 'celery',
    ],
    java: [
      'java', 'spring', 'spring boot', 'spring mvc', 'spring security', 'hibernate', 'jpa',
      'maven', 'gradle', 'junit', 'mockito', 'testng', 'microservices', 'eureka', 'hystrix',
    ],
    javascript: [
      'javascript', 'typescript', 'react', 'react.js', 'redux', 'angular', 'vue', 'next.js',
      'node.js', 'nodejs', 'express', 'es6', 'websocket', 'spa',
    ],
    frontend: [
      'html', 'html5', 'css', 'css3', 'bootstrap', 'tailwind', 'responsive', 'frontend', 'front-end', 'sass', 'figma',
    ],
    csharp: [
      'c#', 'csharp', '.net', 'asp.net', 'entity framework', 'dotnet', 'blazor', 'wpf',
    ],
    php: ['php', 'laravel', 'symfony', 'wordpress'],
    ruby: ['ruby', 'rails', 'ruby on rails'],
    mobile: ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'xamarin', 'swiftui'],
    ai_ml: [
      'ai', 'machine learning', 'ml', 'deep learning', 'llm', 'llms', 'openai', 'openai api',
      'langchain', 'langgraph', 'rag', 'nlp', 'bert', 'transformers', 'pytorch', 'tensorflow',
      'keras', 'xgboost', 'scikit-learn', 'sklearn', 'prompt engineering', 'hugging face',
      'shap', 'lime', 'feature engineering', 'hyperparameter tuning', 'generative ai', 'computer vision', 'opencv',
    ],
    data: [
      'sql', 'postgresql', 'mysql', 'oracle', 'mongodb', 'etl', 'elt', 'data modeling', 'spark',
      'apache spark', 'hadoop', 'airflow', 'databricks', 'pandas', 'numpy', 'dbt', 'snowflake', 'redshift',
    ],
    analytics: [
      'power bi', 'tableau', 'looker', 'excel', 'google analytics', 'ga4', 'data visualization', 'dashboarding',
    ],
    aws: [
      'aws', 'lambda', 's3', 'ec2', 'rds', 'eks', 'sagemaker', 'serverless', 'cloudformation', 'cloudwatch',
    ],
    azure: [
      'azure', 'azure devops', 'event hubs', 'azure ml', 'azure functions', 'bicep', 'aks',
    ],
    gcp: ['gcp', 'google cloud', 'bigquery', 'cloud run', 'gke', 'pubsub'],
    devops: [
      'docker', 'kubernetes', 'k8s', 'helm', 'jenkins', 'github actions', 'ci/cd', 'terraform',
      'prometheus', 'grafana', 'elk', 'splunk', 'git', 'ansible', 'datadog',
    ],
    messaging: [
      'kafka', 'apache kafka', 'rabbitmq', 'jms', 'sqs', 'event-driven', 'protocol buffers', 'grpc', 'pubsub',
    ],
    testing: [
      'pytest', 'unittest', 'junit', 'mockito', 'selenium', 'cypress', 'playwright', 'testng', 'jest', 'uat', 'qa',
    ],
    security: [
      'cybersecurity', 'penetration testing', 'siem', 'firewall', 'oauth', 'jwt', 'encryption', 'iso 27001', 'soc 2', 'zero trust',
    ],
    networking: [
      'networking', 'tcp/ip', 'dns', 'vpn', 'cisco', 'routing', 'switching', 'lan', 'wan', 'load balancer',
    ],
    itsupport: [
      'it support', 'help desk', 'desktop support', 'active directory', 'office 365', 'microsoft 365', 'servicenow', 'ticketing',
    ],
    erp: [
      'sap', 's/4hana', 'abap', 'fiori', 'salesforce', 'dynamics 365', 'netsuite', 'oracle erp', 'workday',
    ],
    sales: [
      'sales', 'b2b sales', 'account executive', 'pipeline', 'crm', 'hubspot', 'negotiation', 'quota', 'lead generation',
    ],
    marketing: [
      'digital marketing', 'seo', 'sem', 'ppc', 'google ads', 'facebook ads', 'content marketing', 'email marketing', 'campaign management',
    ],
    finance: [
      'accounting', 'gaap', 'ifrs', 'financial modeling', 'forecasting', 'budgeting', 'fp&a', 'audit', 'quickbooks', 'reconciliation',
    ],
    hr: [
      'human resources', 'talent acquisition', 'recruiting', 'hris', 'workday', 'payroll', 'employee relations', 'onboarding',
    ],
    supply_chain: [
      'supply chain', 'logistics', 'procurement', 'inventory', 'warehousing', 'demand planning', 'wms', 's&op',
    ],
    manufacturing: [
      'manufacturing', 'lean', 'six sigma', 'kaizen', 'quality control', 'cnc', 'plc', 'oee', 'mes', 'iso 9001',
    ],
    healthcare: [
      'nursing', 'patient care', 'ehr', 'epic', 'cerner', 'hipaa', 'clinical', 'pharmacy', 'medical coding', 'icd-10',
    ],
    design: [
      'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui/ux', 'wireframing', 'prototyping', 'design systems',
    ],
    project_mgmt: [
      'project management', 'pmp', 'prince2', 'jira', 'ms project', 'stakeholder management', 'risk management', 'agile', 'scrum',
    ],
    legal: [
      'legal research', 'contract drafting', 'compliance', 'gdpr', 'litigation', 'paralegal', 'contract management',
    ],
    mechanical: [
      'mechanical engineering', 'solidworks', 'autocad', 'ansys', 'fea', 'cad', 'thermodynamics',
    ],
    electrical: [
      'electrical engineering', 'pcb', 'plc', 'scada', 'matlab', 'circuit design', 'power systems',
    ],
    civil: [
      'civil engineering', 'revit', 'bim', 'structural analysis', 'construction management', 'surveying',
    ],
    hospitality: [
      'hospitality', 'hotel management', 'guest services', 'food safety', 'haccp', 'pos', 'retail', 'merchandising',
    ],
    education: [
      'teaching', 'curriculum', 'lesson planning', 'classroom management', 'instructional design', 'lms', 'iep',
    ],
  };

  const ATS_RULES_KB = [
    { id: 'kw-primary', text: 'Primary keywords must appear in skills section and experience bullets for ATS match score' },
    { id: 'kw-secondary', text: 'Secondary keywords should appear at least once in resume body or skills' },
    { id: 'skill-families', text: 'Keep related skill families together across all job categories — tech business healthcare finance trades and more' },
    { id: 'metrics', text: 'Quantified bullets with numbers percentages dollar amounts improve ATS and recruiter scores' },
    { id: 'summary-title', text: 'Summary is a plain human overview of full work experience for HR — no percentages no metric spam no JD marketing fluff' },
    { id: 'format-headers', text: 'Use ALL CAPS section headers in this order: PROFESSIONAL SUMMARY then TECHNICAL SKILLS then PROFESSIONAL EXPERIENCE then EDUCATION then CERTIFICATIONS if any' },
    { id: 'format-bullets', text: 'Use hyphen bullets avoid tables columns icons special unicode' },
    { id: 'sections', text: 'Canonical resume structure: Name, Title, Contact, PROFESSIONAL SUMMARY, TECHNICAL SKILLS with category windows, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS if any at the end' },
    { id: 'skills-windows', text: 'TECHNICAL SKILLS must use labeled category windows like Languages/Packages: Artificial Intelligence & Machine Learning: Visualization Tools/Database: Database:' },
  ];

  const KEYWORD_EXPANSIONS = {
    'retrieval augmented generation': ['RAG'],
    'rag': ['retrieval augmented generation', 'retrieval-augmented generation'],
    'large language model': ['LLM', 'LLMs'],
    'llms': ['LLM', 'Large Language Model'],
    'llm': ['LLMs', 'Large Language Model', 'large language models'],
    'natural language processing': ['NLP'],
    'nlp': ['natural language processing'],
    'machine learning': ['ML', 'ML models'],
    'ml': ['machine learning'],
    'deep learning': ['neural networks', 'neural network'],
    'ci/cd': ['CI/CD', 'CICD', 'CI-CD', 'continuous integration', 'continuous delivery', 'continuous deployment'],
    'cicd': ['CI/CD', 'CI-CD', 'continuous integration'],
    'rest apis': ['REST API', 'RESTful', 'RESTful APIs', 'REST'],
    'rest api': ['REST APIs', 'RESTful', 'RESTful API', 'REST'],
    'restful': ['REST', 'REST API', 'REST APIs'],
    'html/css': ['HTML', 'CSS', 'HTML5', 'CSS3', 'HTML / CSS'],
    'html': ['HTML5', 'HTML/CSS'],
    'css': ['CSS3', 'HTML/CSS'],
    'javascript': ['JS', 'ECMAScript', 'ES6', 'TypeScript'],
    'typescript': ['TS', 'JavaScript'],
    'node.js': ['NodeJS', 'Node', 'nodejs'],
    'nodejs': ['Node.js', 'Node'],
    'react': ['React.js', 'ReactJS', 'React.js'],
    'react.js': ['React', 'ReactJS'],
    'next.js': ['NextJS', 'Next'],
    'vue': ['Vue.js', 'VueJS'],
    'angular': ['AngularJS', 'Angular.js'],
    '.net': ['dotnet', 'ASP.NET', 'C#'],
    'c#': ['CSharp', 'C Sharp', '.NET'],
    'c++': ['CPP', 'C plus plus'],
    'postgresql': ['Postgres', 'Postgre SQL'],
    'postgres': ['PostgreSQL'],
    'mongodb': ['Mongo', 'Mongo DB'],
    'kubernetes': ['K8s', 'K8S'],
    'k8s': ['Kubernetes'],
    'aws': ['Amazon Web Services', 'Amazon AWS'],
    'amazon web services': ['AWS'],
    'gcp': ['Google Cloud', 'Google Cloud Platform'],
    'google cloud': ['GCP', 'Google Cloud Platform'],
    'azure': ['Microsoft Azure'],
    'docker': ['containers', 'containerization', 'Dockerfile'],
    'terraform': ['IaC', 'Infrastructure as Code'],
    'infrastructure as code': ['IaC', 'Terraform'],
    'kafka': ['Apache Kafka', 'event streaming'],
    'apache kafka': ['Kafka'],
    'spark': ['Apache Spark'],
    'apache spark': ['Spark'],
    'airflow': ['Apache Airflow'],
    'pytorch': ['PyTorch', 'Torch'],
    'tensorflow': ['TF', 'Tensor Flow'],
    'scikit-learn': ['sklearn', 'scikit learn'],
    'sklearn': ['scikit-learn'],
    'qa automation': ['test automation', 'automated testing', 'QA'],
    'test automation': ['QA automation', 'automated testing'],
    'langchain': ['LangChain', 'LangGraph'],
    'langgraph': ['LangGraph', 'LangChain'],
    'autogen': ['AutoGen', 'Microsoft AutoGen', 'multi-agent'],
    'openai': ['OpenAI', 'GPT', 'ChatGPT', 'OpenAI API'],
    'openai api': ['OpenAI', 'GPT'],
    'databricks': ['Databricks', 'Apache Spark'],
    'embeddings': ['embedding', 'vector embedding', 'vector embeddings'],
    'vector database': ['vector db', 'vector store', 'embeddings'],
    'software engineering': ['software development'],
    'code generation': ['generative AI', 'GitHub Copilot', 'Copilot'],
    'github actions': ['GH Actions', 'CI/CD'],
    'power bi': ['PowerBI', 'Power Bi'],
    'powerbi': ['Power BI'],
    'sql': ['T-SQL', 'PL/SQL', 'PostgreSQL', 'MySQL'],
    'pl/sql': ['PLSQL', 'Oracle PL/SQL', 'SQL'],
    'plsql': ['PL/SQL'],
    'oracle': ['Oracle DB', 'Oracle Database'],
    'microservices': ['micro-services', 'microservice architecture'],
    'graphql': ['Graph QL'],
    'fastapi': ['Fast API'],
    'spring boot': ['SpringBoot', 'Spring'],
    'unit testing': ['unit tests', 'unittest', 'Jest', 'JUnit', 'pytest'],
  };

  const STOP_TERMS = new Set([
    'the', 'and', 'for', 'with', 'you', 'our', 'will', 'have', 'this', 'that', 'your',
    'are', 'from', 'able', 'work', 'team', 'role', 'job', 'years', 'year', 'experience',
    'required', 'preferred', 'including', 'using', 'within', 'across', 'ability', 'strong',
    'excellent', 'good', 'must', 'should', 'would', 'about', 'company', 'position',
    'hybrid', 'remote', 'onsite', 'full', 'time', 'benefits', 'salary', 'equal',
    'opportunity', 'employer', 'applicants', 'candidate', 'candidates', 'skills',
    'responsibilities', 'requirements', 'qualifications', 'description', 'summary',
  ]);

  // ─── BM25 ───────────────────────────────────────────────────────
  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z0-9+#./]+/g) || []).filter(t => t.length > 1 && !STOP_TERMS.has(t));
  }

  class BM25Index {
    constructor(docs) {
      this.docs = docs;
      this.k1 = 1.5;
      this.b = 0.75;
      this.docFreq = {};
      this.docLens = [];
      this.avgLen = 0;
      this._build();
    }

    _build() {
      const tfMaps = [];
      for (const doc of this.docs) {
        const tokens = tokenize(doc.text);
        this.docLens.push(tokens.length);
        const tf = {};
        for (const t of tokens) {
          tf[t] = (tf[t] || 0) + 1;
          this.docFreq[t] = (this.docFreq[t] || 0) + 1;
        }
        tfMaps.push(tf);
      }
      this.tfMaps = tfMaps;
      this.avgLen = this.docLens.reduce((a, b) => a + b, 0) / Math.max(this.docLens.length, 1);
      this.N = this.docs.length;
    }

    search(query, topK = 10) {
      const qTokens = tokenize(query);
      const scores = this.docs.map((doc, i) => {
        let score = 0;
        const dl = this.docLens[i];
        const tf = this.tfMaps[i];
        for (const term of qTokens) {
          const f = tf[term] || 0;
          if (!f) continue;
          const df = this.docFreq[term] || 0;
          const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
          score += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / this.avgLen));
        }
        return { id: doc.id, score, doc };
      });
      return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
    }
  }

  // ─── JD PARSING ─────────────────────────────────────────────────
  function jdHash(str) {
    let h = 5381;
    for (let i = 0; i < Math.min(str.length, 2000); i++)
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  function chunkJD(jd) {
    const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
    const chunks = [];
    let buf = [];
    for (const line of lines) {
      if (/^(requirements?|qualifications?|responsibilities|skills|about|what you|must have|nice to have)/i.test(line) && buf.length) {
        chunks.push(buf.join(' '));
        buf = [line];
      } else {
        buf.push(line);
      }
      if (buf.join(' ').length > 400) {
        chunks.push(buf.join(' '));
        buf = [];
      }
    }
    if (buf.length) chunks.push(buf.join(' '));
    return chunks.length ? chunks : [jd];
  }

  function extractJdTitle(jd) {
    const titleLabelMatch = jd.match(/(?:job title|position title|role title|position)\s*[:\-]\s*([^\n]{3,80})/i);
    if (titleLabelMatch) {
      const t = cleanJdTitleCandidate(titleLabelMatch[1]);
      if (t) return t;
    }
    const m = jd.match(/(?:seeking|hiring|looking for)\s+an?\s+([A-Z][A-Za-z0-9\s\/\-]{3,50}?)(?:\s+to\b|\s+who\b|\s+with\b|[,\n])/);
    if (m) {
      const t = cleanJdTitleCandidate(m[1]);
      if (t) return t;
    }
    const skipRe = /^(about|why join|why you|who we|job summary|overview|description|we are|our purpose|responsibilities|requirements|qualifications|essential|general purpose|benefits|equal opportunity|who we hire|physical demands)/i;
    for (const line of jd.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 25)) {
      if (line.length < 4 || line.length > 60 || skipRe.test(line)) continue;
      if (/\?$/.test(line)) continue; // marketing questions like "Why join us?"
      const w = line.split(/\s+/);
      if (w.length >= 2 && w.length <= 8 && /^[A-Z]/.test(line) && !/herman|miller|knoll|inc\.|llc|corp/i.test(line)) {
        const t = cleanJdTitleCandidate(line);
        if (t) return t;
      }
    }
    return '';
  }

  function cleanJdTitleCandidate(raw) {
    if (!raw) return '';
    let t = raw.replace(/[?!.]+$/g, '').trim();
    t = t.replace(/^(why join us|about the job|job description)\s*[:\-]?\s*/i, '').trim();
    if (!t || /^(why join|about|overview|description|qualifications|requirements)$/i.test(t)) return '';
    if (t.length < 3 || t.length > 70) return '';
    return t;
  }

  /**
   * Job titles / roles must NOT enter primary/secondary keyword lists.
   * Keep technical domains ("Data Engineering", "Cloud Architecture") — drop role titles ("Data Engineer", "AI Engineer").
   */
  function isJobRoleKeyword(term) {
    const t = (term || '').trim();
    if (!t) return true;
    const lower = t.toLowerCase().replace(/\s+/g, ' ');
    if (lower.length < 2) return true;
    if (/^(senior|junior|staff|principal|lead|mid-level|entry[- ]level|cross-functional|we|our|us|soft|hard|new|old|ai|ml)$/i.test(lower)) return true;
    // Domain phrases (keep) — e.g. Data Engineering, Cloud Architecture
    if (/\b(engineering|architecture|management|analysis|administration|development)\b/.test(lower) &&
        !/\b(engineers?|developers?|architects?|managers?|analysts?|administrators?|admins?)\b/.test(lower)) {
      return false;
    }
    // Role / job-title nouns (drop)
    if (/\b(engineers?|developers?|architects?|analysts?|managers?|scientists?|administrators?|admins?|consultants?|specialists?|directors?|coordinators?|owners?|associates?|interns?|writers?|recruiters?|teachers?|nurses?|designers?)\b/.test(lower)) {
      return true;
    }
    // Known role labels from KB that are titles, not tools
    if (/^(software engineer|qa engineer|ai engineer|business analyst|product manager|scrum master|data scientist|data analyst|program management|technical writer|research scientist)$/i.test(lower)) {
      return true;
    }
    return false;
  }

  /**
   * Ambiguous / overloaded skill labels must be explicitly grounded in the JD.
   * Prevents BM25 false positives like "Report generation" → RAG (via "generation").
   */
  const AMBIGUOUS_SKILL_GROUNDING = {
    rag: [
      /\brag\b/i,
      /retrieval[-\s]?augmented/i,
      /vector\s+(db|database|store|search|index)/i,
      /\bembeddings?\b/i,
      /\bsemantic\s+search\b/i,
      /\b(pinecone|weaviate|chroma|faiss|milvus)\b/i,
    ],
    llm: [
      /\bllms?\b/i,
      /large language models?/i,
      /\bgpt-?\d*\b/i,
      /\bchatgpt\b/i,
      /\bopenai\b/i,
      /\bclaude\b/i,
      /\bgemini\b/i,
      /prompt engineering/i,
    ],
    'code generation': [
      /code generation/i,
      /github copilot/i,
      /\bcopilot\b/i,
      /\bcursor\b/i,
    ],
    langchain: [/langchain/i, /langgraph/i, /llamaindex/i, /\bhaystack\b/i],
    autogen: [/\bautogen\b/i, /multi-agent/i, /crewai/i, /agentic ai/i],
    nlp: [/\bnlp\b/i, /natural language processing/i, /\bspacy\b/i, /hugging face/i, /\bbert\b/i],
    mlops: [/\bmlops\b/i, /model deployment/i, /model serving/i, /feature store/i, /\bmlflow\b/i, /\bkubeflow\b/i],
    'machine learning': [
      /machine learning/i,
      /\bdeep learning\b/i,
      /\btensorflow\b/i,
      /\bpytorch\b/i,
      /scikit-learn/i,
      /neural networks?/i,
      /\bml models?\b/i,
      /(?<![a-z])ml(?![a-z])/i,
    ],
  };

  function skillGroundedInJd(label, jd) {
    const key = String(label || '').toLowerCase().trim();
    const rules = AMBIGUOUS_SKILL_GROUNDING[key];
    if (!rules || !rules.length) return true;
    const text = String(jd || '');
    return rules.some(re => re.test(text));
  }

  function filterGroundedKeywords(list, jd) {
    return (list || []).filter(kw => skillGroundedInJd(kw, jd));
  }

  // Tokens too generic to prove a KB skill is actually in the JD
  // (stops "development"/"design"/"troubleshooting" from pulling unrelated domains).
  const GENERIC_EVIDENCE_TOKENS = new Set([
    'development', 'design', 'management', 'training', 'support', 'architecture',
    'analysis', 'engineering', 'administration', 'service', 'services', 'system',
    'systems', 'data', 'cloud', 'security', 'quality', 'process', 'processes',
    'business', 'customer', 'technical', 'software', 'application', 'applications',
    'database', 'databases', 'reporting', 'report', 'reports', 'documentation',
    'implementation', 'implement', 'maintain', 'maintenance', 'optimize', 'optimization',
    'performance', 'availability', 'production', 'environment', 'environments',
    'integration', 'migration', 'modeling', 'model', 'planning', 'procedures',
    'procedure', 'functions', 'function', 'jobs', 'job', 'roles', 'role',
    'permissions', 'auditing', 'backup', 'backups', 'recovery', 'monitoring',
    'collaborate', 'communication', 'teamwork', 'problem', 'analytical',
    'experience', 'knowledge', 'skills', 'skill', 'tools', 'tool', 'best',
    'practices', 'industry', 'trends', 'graduate', 'years', 'minimum',
    'strong', 'advanced', 'excellent', 'effective', 'required', 'plus',
    'troubleshooting', // too common in ops JDs — must not unlock IT Support alone
    'onboarding', 'retention', 'pipeline', 'campaign', 'branding', 'editing',
  ]);

  // Soft domain labels — never primary; allowed as SECONDARY when JD has lexical evidence
  const SECONDARY_DOMAIN_LABELS = new Set([
    'business development', 'game development', 'mobile development', 'customer experience',
    'customer service', 'learning development', 'graphic design', 'instructional design',
    'content writing', 'video production', 'sales', 'account management', 'brand marketing',
    'growth marketing', 'public relations', 'human resources', 'talent acquisition',
    'diversity inclusion', 'compensation benefits', 'architecture', 'interior design',
    'operations management', 'supply chain', 'warehouse management', 'transportation',
    'project management', 'program management', 'product manager', 'scrum master',
    'technical writer', 'business analyst', 'data scientist', 'data analyst',
    'ai engineer', 'software engineer', 'qa engineer', 'code generation',
    'dependency injection', 'embedded systems', 'blockchain', 'it support',
    'digital marketing', 'marketing analytics', 'ui/ux design', 'agile',
    'data engineering', 'cloud architecture', 'devops', 'cybersecurity',
  ]);

  // Back-compat alias used below
  const DOMAIN_FLUFF_LABELS = SECONDARY_DOMAIN_LABELS;

  const SKILL_BY_LABEL = new Map(SKILL_KB.map(s => [s.label.toLowerCase(), s]));

  // Every known tool/skill string from the KB (labels + terms) for strict matching
  const KNOWN_SKILL_VOCAB = new Set();
  SKILL_KB.forEach(s => {
    KNOWN_SKILL_VOCAB.add(s.label.toLowerCase());
    (s.terms || []).forEach(t => KNOWN_SKILL_VOCAB.add(String(t).toLowerCase().trim()));
  });
  [
    'mssql', 'mysql', 'mongodb', 'mongo', 'powershell', 'pwsh', 'bash', 'python',
    'aws', 'azure', 'gcp', 'sql', 'nosql', 'linux', 'unix', 'docker', 'kubernetes',
    'terraform', 'jenkins', 'git', 'github', 'gitlab', 'java', 'javascript', 'typescript',
    'react', 'node.js', 'nodejs', 'c#', '.net', 'html', 'css', 'rest', 'api',
  ].forEach(t => KNOWN_SKILL_VOCAB.add(t));

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isKnownSkillVocab(term) {
    const lower = String(term || '').toLowerCase().trim().replace(/[.,;:…]+$/g, '');
    if (!lower) return false;
    if (KNOWN_SKILL_VOCAB.has(lower)) return true;
    if (SECONDARY_DOMAIN_LABELS.has(lower)) return true;
    if (SKILL_BY_LABEL.has(lower)) return true;
    return false;
  }

  /** Single-token tech only (AWS, Python, C#) — never multi-word JD prose. */
  function isFreeFormTechToken(term) {
    const t = String(term || '').trim().replace(/[.,;:…]+$/g, '');
    if (!t || /\s/.test(t)) return false;
    if (/^(the|and|or|you|will|their|our|for|with|from|this|that|as|to|of|in|on|a|an|by)$/i.test(t)) return false;
    if (/^(ensuring|including|providing|performing|writing|designing|implementing|maintaining)$/i.test(t)) return false;
    // Acronyms / tools / languages
    if (/^[A-Z]{2,12}$/.test(t)) return true;
    if (/^(C\+\+|C#|\.NET|[A-Za-z][A-Za-z0-9+#.]{1,24})$/.test(t) && t.length <= 24) {
      // Reject English filler capitalized mid-sentence
      if (/^(Will|Their|Performance|Availability|Security|Planning|Practices|Reusable|Required|Experience)$/i.test(t)) return false;
      return isKnownSkillVocab(t) || /^[A-Z]{2,}$/.test(t) || /[#.+]/.test(t);
    }
    return false;
  }

  function tokenIsEvidence(term) {
    const t = String(term || '').toLowerCase().trim();
    if (t.length < 2) return false;
    if (GENERIC_EVIDENCE_TOKENS.has(t)) return false;
    // Single ultra-short tokens only if tech-ish (sql, aws, gcp, cia…)
    if (t.length <= 2 && !/^[a-z]{2,3}$/i.test(t)) return false;
    return true;
  }

  /** True when JD contains a distinctive tool/skill phrase — not just shared fluff words. */
  function skillHasLexicalEvidence(label, jd) {
    const text = String(jd || '').toLowerCase();
    if (!text.trim()) return false;
    const skill = SKILL_BY_LABEL.get(String(label || '').toLowerCase());
    const rawCandidates = skill
      ? [skill.label, ...skill.terms]
      : [label];
    const candidates = rawCandidates
      .map(t => String(t || '').toLowerCase().trim())
      .filter(tokenIsEvidence)
      // Prefer longer / more specific phrases first
      .sort((a, b) => b.length - a.length);

    for (const term of candidates) {
      if (term.length <= 3) {
        if (new RegExp('(?<![a-z0-9])' + escapeRe(term) + '(?![a-z0-9])', 'i').test(text)) return true;
      } else if (term.includes(' ') || term.includes('/') || term.includes('.') || term.includes('#')) {
        if (text.includes(term)) return true;
        const flex = escapeRe(term).replace(/\\\s+/g, '[\\s./-]+');
        if (new RegExp(flex, 'i').test(text)) return true;
      } else if (new RegExp('(?<![a-z0-9])' + escapeRe(term) + '(?![a-z0-9])', 'i').test(text)) {
        return true;
      }
    }
    return false;
  }

  /** Concrete ATS skills only: known tools/languages — never JD prose fragments. */
  function isConcreteSkillKeyword(term) {
    const cleaned = String(term || '').trim().replace(/[.,;:…]+$/g, '').trim();
    if (!cleaned || cleaned.length < 2 || cleaned.length > 48) return false;
    const lower = cleaned.toLowerCase();
    if (STOP_TERMS.has(lower)) return false;
    if (isJobRoleKeyword(cleaned)) return false;
    if (DOMAIN_FLUFF_LABELS.has(lower)) return false;
    // Reject JD prose / section headers / conjunction fragments
    if (/^(and|or|the|you|will|their|our|ensuring|including|with|from|into|for|as|to|of|by|write|writing|design|implement|ensure|provide|assist|maintain|stay|report|perform|performing)\b/i.test(cleaned)) return false;
    if (/\b(you will|will…|will\.\.\.|their performance|auditing practices|disaster recovery planning|write reusable)\b/i.test(cleaned)) return false;
    // Generic nouns
    if (/^(database|databases|dba|microsoft|server|servers|knowledge|backup|backups|trigger|triggers|jobs?|agent|rds|functions?|procedures?|coding|programming|software|hardware|systems?|tools?|platforms?|frameworks?|technologies|tech|stack|code|scripting|availability|security|performance|practices|planning|reusable|required)$/i.test(cleaned)) return false;
    if (/^(communication|leadership|teamwork|collaboration|problem solving|critical thinking)$/i.test(cleaned)) return false;
    if (/^(hiring|experience|experiences?|requirements?|responsibilities|qualifications?|about|overview)$/i.test(cleaned)) return false;
    if (cleaned.split(/\s+/).length > 3) return false;
    // Must be a known skill/tool OR a single tech token (AWS, Python) — never free-form Title Case prose
    if (isKnownSkillVocab(cleaned)) return true;
    if (isFreeFormTechToken(cleaned)) return true;
    return false;
  }

  /** Soft/domain labels — secondary bucket only (not primary hard skills). */
  function isSecondaryDomainKeyword(term) {
    const cleaned = String(term || '').trim().replace(/[.,;:]+$/g, '').trim();
    if (!cleaned) return false;
    const lower = cleaned.toLowerCase();
    if (!SECONDARY_DOMAIN_LABELS.has(lower)) return false;
    if (isJobRoleKeyword(cleaned)) return false;
    return true;
  }

  function isKeywordCandidate(term) {
    return isConcreteSkillKeyword(term) || isSecondaryDomainKeyword(term);
  }

  function filterSecondaryKeywords(list, limit = 10, jd) {
    const out = [];
    for (const kw of list || []) {
      if (!kw || typeof kw !== 'string') continue;
      const cleaned = kw.trim().replace(/[.,;:]+$/g, '').trim();
      if (!cleaned) continue;
      // Secondary = leftover concrete skills OR domain labels with JD evidence
      if (isConcreteSkillKeyword(cleaned)) {
        // ok
      } else if (isSecondaryDomainKeyword(cleaned)) {
        if (jd && !skillHasLexicalEvidence(cleaned, jd)) continue;
        if (jd && !skillGroundedInJd(cleaned, jd)) continue;
      } else {
        continue;
      }
      if (out.some(u => u.toLowerCase() === cleaned.toLowerCase())) continue;
      out.push(cleaned);
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Primary bucket: hard skills / tools only. Cap is a max, not a target to pad. */
  function filterTechnicalKeywords(list, limit = 15) {
    const out = [];
    for (const kw of list || []) {
      if (!kw || typeof kw !== 'string') continue;
      const cleaned = kw.trim().replace(/[.,;:]+$/g, '').trim();
      if (!isConcreteSkillKeyword(cleaned)) continue;
      if (out.some(u => u.toLowerCase() === cleaned.toLowerCase())) continue;
      out.push(cleaned);
      if (out.length >= limit) break;
    }
    return out;
  }

  function extractDirectTerms(jd) {
    const found = new Map();
    const add = (term, weight) => {
      let t = term.trim().replace(/[.,;:…]+$/g, '').trim();
      if (t.length < 2 || t.length > 40) return;
      // Map aliases to canonical labels when possible
      const canonMap = {
        mongo: 'MongoDB', mongodb: 'MongoDB', mssql: 'MSSQL', mysql: 'MySQL',
        powershell: 'PowerShell', pwsh: 'PowerShell', bash: 'Bash', python: 'Python',
        aws: 'AWS', azure: 'Azure', 'sql server': 'MSSQL', 'microsoft sql server': 'MSSQL',
      };
      t = canonMap[t.toLowerCase()] || t;
      if (!isConcreteSkillKeyword(t) && !isSecondaryDomainKeyword(t)) return;
      // Free-form multi-word must be known vocab (blocks "Ensuring Their Performance")
      if (/\s/.test(t) && !isKnownSkillVocab(t)) return;
      const key = t.toLowerCase();
      const display = SKILL_BY_LABEL.has(key) ? SKILL_BY_LABEL.get(key).label : t;
      found.set(key, { term: display, weight: (found.get(key)?.weight || 0) + weight });
    };

    const text = String(jd || '');

    // 1) Scan JD for known skill vocabulary (most reliable)
    const vocab = [...KNOWN_SKILL_VOCAB].filter(v => v.length >= 2).sort((a, b) => b.length - a.length);
    for (const v of vocab) {
      if (v.length <= 3) {
        if (new RegExp('(?<![a-z0-9])' + escapeRe(v) + '(?![a-z0-9])', 'i').test(text)) add(v, 5);
      } else if (new RegExp('(?<![a-z0-9])' + escapeRe(v).replace(/\\\s+/g, '[\\s./-]+') + '(?![a-z0-9])', 'i').test(text)
        || text.toLowerCase().includes(v)) {
        add(v, 5);
      }
    }

    // 2) Explicit skill list lines only (Knowledge of: … / Skills: …)
    const skillListBlocks = text.match(/(?:knowledge of|skills?|tech(?:nical)? skills?|tools?|requirements?)[:\s]+([\s\S]{0,500})/gi) || [];
    for (const block of skillListBlocks) {
      block.split(/[,;|•\n]/).forEach(p => {
        const piece = p.replace(/^(?:knowledge of|skills?|tools?|requirements?)[:\s]*/i, '').trim();
        if (piece && piece.length < 40) add(piece, 4);
      });
    }

    // 3) Short acronyms / single tech tokens only (no multi-word Title Case sweeps)
    const acronyms = text.match(/\b(?:[A-Z]{2,12}|C#|\.NET|C\+\+)\b/g) || [];
    acronyms.forEach(t => add(t, 2));

    return [...found.values()].sort((a, b) => b.weight - a.weight);
  }

  function extractKeywordsRAG(jd) {
    const chunks = chunkJD(jd);
    const kbDocs = SKILL_KB.map((s, i) => ({
      id: 'skill-' + i,
      text: [s.label, ...s.terms].join(' '),
      label: s.label,
      terms: s.terms,
    }));
    const bm25 = new BM25Index(kbDocs);

    const scored = new Map();
    const boostSection = (text) => {
      if (/required|must have|minimum|essential|mandatory/i.test(text)) return 2.5;
      if (/preferred|nice to have|bonus|plus/i.test(text)) return 1.5;
      return 1;
    };

    for (const chunk of chunks) {
      const mult = boostSection(chunk);
      const hits = bm25.search(chunk, 15);
      for (const hit of hits) {
        const label = hit.doc.label;
        if (!skillHasLexicalEvidence(label, jd)) continue;
        if (!isKeywordCandidate(label)) continue;
        const prev = scored.get(label) || 0;
        scored.set(label, prev + hit.score * mult);
      }
    }

    // Full-JD BM25 pass
    bm25.search(jd, 20).forEach(hit => {
      const label = hit.doc.label;
      if (!skillHasLexicalEvidence(label, jd)) return;
      if (!isKeywordCandidate(label)) return;
      scored.set(label, (scored.get(label) || 0) + hit.score * 0.5);
    });

    // Direct JD term extraction — concrete skills for primary; domain phrases skipped here (KB handles them)
    for (const { term, weight } of extractDirectTerms(jd)) {
      if (!isConcreteSkillKeyword(term)) continue;
      if (!skillHasLexicalEvidence(term, jd) && !SKILL_BY_LABEL.has(term.toLowerCase())) {
        const exact = new RegExp('(?<![a-z0-9])' + escapeRe(term) + '(?![a-z0-9])', 'i');
        if (!exact.test(jd)) continue;
      } else if (SKILL_BY_LABEL.has(term.toLowerCase()) && !skillHasLexicalEvidence(term, jd)) {
        continue;
      }
      const display = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const existing = [...scored.keys()].find(k => k.toLowerCase() === term.toLowerCase());
      if (existing) {
        scored.set(existing, scored.get(existing) + weight);
      } else {
        scored.set(display, weight);
      }
    }

    // Keep JD title for summary scoring only — never as a primary/secondary keyword
    const title = extractJdTitle(jd);

    const ranked = [...scored.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label)
      .filter(label => !isJobRoleKeyword(label))
      .filter(label => isKeywordCandidate(label))
      .filter(label => skillGroundedInJd(label, jd))
      .filter(label => {
        if (SKILL_BY_LABEL.has(String(label).toLowerCase())) return skillHasLexicalEvidence(label, jd);
        return true;
      });

    // Dedupe similar
    const unique = [];
    for (const kw of ranked) {
      const kl = kw.toLowerCase();
      if (unique.some(u => u.toLowerCase() === kl || u.toLowerCase().includes(kl) || kl.includes(u.toLowerCase()))) continue;
      unique.push(kw);
    }

    // Prefer canonical KB labels for known aliases (Mongo → MongoDB, etc.)
    const CANONICAL_ALIASES = {
      mongo: 'MongoDB',
      mongodb: 'MongoDB',
      mssql: 'MSSQL',
      'sql server': 'MSSQL',
      'microsoft sql server': 'MSSQL',
      mysql: 'MySQL',
      powershell: 'PowerShell',
      pwsh: 'PowerShell',
      bash: 'Bash',
      python: 'Python',
      aws: 'AWS',
      azure: 'Azure',
    };
    const canonicalize = (term) => {
      const hit = CANONICAL_ALIASES[String(term || '').toLowerCase().trim()];
      return hit || term;
    };

    const canonUnique = unique.map(canonicalize);

    // PRIMARY = hard skills actually present in the JD (variable count, max 15 — never pad)
    let primary = filterGroundedKeywords(filterTechnicalKeywords(canonUnique, 15), jd);

    // SECONDARY = soft/domain labels first, then leftover hard skills (variable count, max 12)
    const domainSecondary = filterSecondaryKeywords(
      canonUnique.filter(k => isSecondaryDomainKeyword(k)),
      12,
      jd
    );
    const leftoverSkills = filterTechnicalKeywords(
      canonUnique.filter(k => !primary.some(p => p.toLowerCase() === k.toLowerCase())),
      12
    );
    let secondary = [];
    for (const k of [...domainSecondary, ...leftoverSkills]) {
      if (primary.some(p => p.toLowerCase() === k.toLowerCase())) continue;
      if (secondary.some(s => s.toLowerCase() === k.toLowerCase())) continue;
      secondary.push(k);
      if (secondary.length >= 12) break;
    }

    // Only backfill when extraction is extremely thin — still only JD-grounded skills
    if (primary.length < 3) {
      for (const { term } of extractDirectTerms(jd)) {
        if (primary.length >= 15) break;
        const canon = canonicalize(term);
        if (!isConcreteSkillKeyword(canon)) continue;
        if (isJobRoleKeyword(canon)) continue;
        if (!skillGroundedInJd(canon, jd)) continue;
        if (SKILL_BY_LABEL.has(canon.toLowerCase()) && !skillHasLexicalEvidence(canon, jd)) continue;
        if (!primary.some(p => p.toLowerCase() === canon.toLowerCase())) primary.push(canon);
      }
    }

    const aliasMap = buildAliasMap([...primary, ...secondary]);

    return {
      primary,
      secondary,
      aliasMap,
      title,
      jdKeywordCount: primary.length,
      extractedFromJd: true,
      chunks,
      confidence: primary.length >= 6 ? 'high' : primary.length >= 3 ? 'medium' : 'low',
      source: 'rag',
    };
  }

  // ─── KEYWORD MATCHING (shared with ATS score) ───────────────────
  function normalizeResumeForMatch(text) {
    return String(text || '')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u00A0\u200B\u200C\u200D\uFEFF\u202F]/g, ' ')
      // Normalize fancy bullets so paste-from-Word still looks like skill/bullet text
      .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25CF\u25C6●•‣▸▶►○◦]/g, '- ')
      .replace(/[\/\\|]+/g, '/') // collapse odd separators toward slash form
      .replace(/\s+/g, ' ');
  }

  function kwInText(kw, text) {
    const escaped = String(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow flexible whitespace / hyphen / slash between tokens (Node.js ~ Node js)
    const flexible = escaped
      .replace(/\\\//g, '[\\\\/\\s.-]+')
      .replace(/\\-/g, '[\\\\/\\s.-]+')
      .replace(/\\\s+/g, '[\\\\s./-]+');
    return new RegExp('(?<![a-zA-Z0-9])' + flexible + '(?![a-zA-Z0-9])', 'i').test(text);
  }

  function expandKeyword(kw) {
    const forms = new Set();
    const add = (v) => {
      const t = String(v || '').trim();
      if (t.length >= 2) forms.add(t);
    };
    const k = String(kw || '').trim();
    add(k);
    add(k.replace(/\./g, ''));           // Node.js → Nodejs
    add(k.replace(/[/-]/g, ' '));        // CI/CD → CI CD
    add(k.replace(/[/-]/g, ''));         // CI/CD → CICD
    add(k.replace(/\s+/g, ''));          // Power BI → PowerBI

    const trailingWords = /\s+(pipelines?|models?|tools?|frameworks?|systems?|apis?|services?|techniques?|methods?|practices?|processes?|solutions?|platforms?|technologies?|stacks?)$/i;
    const stripped = k.replace(trailingWords, '').trim();
    if (stripped !== k) add(stripped);

    if (/s$/i.test(k) && k.length > 3 && !/ss$/i.test(k)) add(k.slice(0, -1));
    if (!/s$/i.test(k) && k.length > 2) add(k + 's');

    // Slash compounds: HTML/CSS → also try HTML + CSS (both must appear)
    if (k.includes('/')) {
      k.split('/').map(p => p.trim()).filter(Boolean).forEach(add);
    }

    const seed = [...forms];
    for (const form of seed) {
      const lower = form.toLowerCase();
      if (KEYWORD_EXPANSIONS[lower]) KEYWORD_EXPANSIONS[lower].forEach(add);
      // Also lookup compacted / spaced variants
      const compact = lower.replace(/[\s./-]+/g, '');
      for (const [key, vals] of Object.entries(KEYWORD_EXPANSIONS)) {
        if (key.replace(/[\s./-]+/g, '') === compact) vals.forEach(add);
      }
    }
    return [...forms];
  }

  function slashPartsPresent(kw, text) {
    if (!kw.includes('/')) return false;
    const parts = kw.split('/').map(p => p.trim()).filter(p => p.length >= 2);
    if (parts.length < 2) return false;
    // Count compound keyword as found when every part appears somewhere (common in Skills lists)
    return parts.every(p => kwInText(p, text) || expandKeyword(p).some(f => kwInText(f, text)));
  }

  function kwOrAliasInText(canonical, text, aliasMap) {
    const normalized = normalizeResumeForMatch(text);
    const aliases = aliasMap?.[canonical] || [canonical];
    const allForms = [];
    aliases.forEach(a => allForms.push(...expandKeyword(a)));
    if (allForms.some(form => kwInText(form, normalized) || kwInText(form, text))) return true;
    // Compound skills like HTML/CSS, CI/CD already handled via expansions; also accept split skills
    if (slashPartsPresent(canonical, normalized) || slashPartsPresent(canonical, text)) return true;
    return false;
  }

  /** Attach SKILL_KB term aliases so resume phrasing matches JD labels more often. */
  function buildAliasMap(keywords) {
    const map = {};
    for (const kw of keywords || []) {
      const forms = new Set(expandKeyword(kw));
      const kl = String(kw).toLowerCase();
      for (const skill of SKILL_KB) {
        const labelL = skill.label.toLowerCase();
        if (labelL === kl || skill.terms.some(t => t.toLowerCase() === kl || kl.includes(t.toLowerCase()) || t.toLowerCase().includes(kl))) {
          forms.add(skill.label);
          skill.terms.forEach(t => forms.add(t));
        }
      }
      map[kw] = [...forms];
    }
    return map;
  }

  /**
   * Canonical resume structure (from template):
   *   Name
   *   Professional Title
   *   email | phone | LinkedIn
   *   PROFESSIONAL SUMMARY
   *   PROFESSIONAL EXPERIENCE
   *   TECHNICAL SKILLS   (Category: skills…)
   *   EDUCATION
   *   CERTIFICATIONS (optional — only if present, always last)
   */
  const CANONICAL_SECTION_ORDER = ['SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION'];
  const CANONICAL_SECTION_ALIASES = {
    SUMMARY: ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE'],
    EXPERIENCE: ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'WORK HISTORY'],
    SKILLS: ['TECHNICAL SKILLS', 'SKILLS', 'CORE COMPETENCIES', 'TECHNOLOGIES', 'TOOLS & PLATFORMS'],
    EDUCATION: ['EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMIC'],
    CERTIFICATIONS: ['CERTIFICATIONS', 'CERTIFICATION', 'LICENSES', 'LICENCES'],
  };
  const PREFERRED_SECTION_HEADERS = {
    SUMMARY: 'PROFESSIONAL SUMMARY',
    EXPERIENCE: 'PROFESSIONAL EXPERIENCE',
    SKILLS: 'TECHNICAL SKILLS',
    EDUCATION: 'EDUCATION',
    CERTIFICATIONS: 'CERTIFICATIONS',
  };

  function findSectionHeaderIndex(lines, aliases) {
    for (let i = 0; i < lines.length; i++) {
      const u = String(lines[i] || '').trim().toUpperCase().replace(/:$/, '');
      if (!u || u.length > 60) continue;
      if (aliases.some(a => u === a || u.startsWith(a + ' '))) return i;
    }
    return -1;
  }

  function analyzeResumeStructure(resume, resumeLines) {
    const lines = (resumeLines && resumeLines.length)
      ? resumeLines
      : String(resume || '').split(/\r?\n/).map(l => l.trim());
    const nonEmpty = lines.map((l, i) => ({ l: String(l || '').trim(), i })).filter(x => x.l);
    const flags = [];
    const positions = {};

    for (const key of CANONICAL_SECTION_ORDER) {
      const idx = findSectionHeaderIndex(lines, CANONICAL_SECTION_ALIASES[key]);
      positions[key] = idx;
      if (idx < 0) flags.push('Missing section: ' + PREFERRED_SECTION_HEADERS[key]);
    }

    const first = nonEmpty[0]?.l || '';
    const second = nonEmpty[1]?.l || '';
    const headerBlock = nonEmpty.slice(0, 5).map(x => x.l).join('\n');
    const nameOk = first.length > 1 && first.length <= 60
      && !/@|http|linkedin|phone|\d{5}/i.test(first)
      && !/^(resume|curriculum vitae|cv|professional summary|summary)$/i.test(first);
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(headerBlock);
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(headerBlock);
    const hasContactRow = /@/.test(headerBlock) && (/\|/.test(headerBlock) || hasPhone);
    const titleLineOk = second.length > 1 && second.length <= 80
      && !/@/.test(second)
      && !/^(professional summary|summary|professional experience|experience|technical skills|skills|education)$/i.test(second);

    if (!nameOk) flags.push('First line should be the candidate name');
    if (!titleLineOk) flags.push('Add a professional title line under the name (e.g. Data Analyst)');
    if (!hasEmail) flags.push('Contact header needs an email');
    if (!hasPhone) flags.push('Contact header needs a phone number');
    if (!hasContactRow) flags.push('Contact should be one line: email | phone | LinkedIn');

    const preferredHits = {
      SUMMARY: /PROFESSIONAL SUMMARY/i.test(resume),
      EXPERIENCE: /PROFESSIONAL EXPERIENCE/i.test(resume),
      SKILLS: /TECHNICAL SKILLS/i.test(resume),
      EDUCATION: /\bEDUCATION\b/i.test(resume),
    };
    if (positions.SUMMARY >= 0 && !preferredHits.SUMMARY) {
      flags.push('Prefer header "PROFESSIONAL SUMMARY" (template style)');
    }
    if (positions.EXPERIENCE >= 0 && !preferredHits.EXPERIENCE) {
      flags.push('Prefer header "PROFESSIONAL EXPERIENCE" (template style)');
    }
    if (positions.SKILLS >= 0 && !preferredHits.SKILLS) {
      flags.push('Prefer header "TECHNICAL SKILLS" (template style)');
    }

    const presentKeys = CANONICAL_SECTION_ORDER.filter(k => positions[k] >= 0);
    let orderOk = true;
    for (let i = 1; i < presentKeys.length; i++) {
      if (positions[presentKeys[i]] < positions[presentKeys[i - 1]]) {
        orderOk = false;
        break;
      }
    }
    if (!orderOk) {
      flags.push('Section order must be: PROFESSIONAL SUMMARY → TECHNICAL SKILLS → PROFESSIONAL EXPERIENCE → EDUCATION → CERTIFICATIONS (if any)');
    }

    // CERTIFICATIONS is optional — but if present it must be the last section
    const certIdx = findSectionHeaderIndex(lines, CANONICAL_SECTION_ALIASES.CERTIFICATIONS);
    positions.CERTIFICATIONS = certIdx;
    let certificationsAtEnd = true;
    if (certIdx >= 0) {
      const laterCore = CANONICAL_SECTION_ORDER.filter(k => positions[k] > certIdx);
      if (laterCore.length) {
        certificationsAtEnd = false;
        flags.push('CERTIFICATIONS must be at the end (after EDUCATION)');
      }
      const afterCert = lines.slice(certIdx + 1).some(l => {
        const u = String(l || '').trim().toUpperCase().replace(/:$/, '');
        return /^(PROFESSIONAL SUMMARY|SUMMARY|TECHNICAL SKILLS|SKILLS|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EDUCATION|PROJECTS|PUBLICATIONS)$/.test(u);
      });
      if (afterCert) {
        certificationsAtEnd = false;
        if (!flags.some(f => f.includes('CERTIFICATIONS must be at the end'))) {
          flags.push('CERTIFICATIONS must be at the end (after EDUCATION)');
        }
      }
      // Certifications should come after Education when both exist
      if (positions.EDUCATION >= 0 && certIdx < positions.EDUCATION) {
        certificationsAtEnd = false;
        if (!flags.some(f => f.includes('CERTIFICATIONS must be at the end'))) {
          flags.push('CERTIFICATIONS must be at the end (after EDUCATION)');
        }
      }
    }

    let skillWindowCount = 0;
    if (positions.SKILLS >= 0) {
      const end = presentKeys.map(k => positions[k]).filter(i => i > positions.SKILLS).sort((a, b) => a - b)[0]
        ?? lines.length;
      for (let i = positions.SKILLS + 1; i < end; i++) {
        const line = String(lines[i] || '').trim();
        if (/^[A-Za-z][\w\s/&()+.-]{1,40}:\s*\S/.test(line)) skillWindowCount++;
      }
    }
    if (positions.SKILLS >= 0 && skillWindowCount < 2) {
      flags.push('TECHNICAL SKILLS should use labeled category windows (e.g. Languages/Packages: …, Database: …)');
    }

    let roleLineCount = 0;
    if (positions.EXPERIENCE >= 0) {
      const end = presentKeys.map(k => positions[k]).filter(i => i > positions.EXPERIENCE).sort((a, b) => a - b)[0]
        ?? lines.length;
      for (let i = positions.EXPERIENCE + 1; i < end; i++) {
        const line = String(lines[i] || '').trim();
        if ((line.match(/\|/g) || []).length >= 1 && !/^[-•*]/.test(line) && line.length < 140) {
          roleLineCount++;
        }
      }
    }
    if (positions.EXPERIENCE >= 0 && roleLineCount < 1) {
      flags.push('EXPERIENCE roles should use: Company | Location | Title (with dates)');
    }

    const missingCount = CANONICAL_SECTION_ORDER.filter(k => positions[k] < 0).length;
    let score = 100;
    score -= missingCount * 15;
    if (!nameOk) score -= 10;
    if (!hasEmail) score -= 8;
    if (!hasPhone) score -= 5;
    if (!hasContactRow) score -= 5;
    if (!titleLineOk) score -= 5;
    if (!orderOk) score -= 20;
    if (!certificationsAtEnd) score -= 12;
    if (positions.SKILLS >= 0 && skillWindowCount < 2) score -= 10;
    if (positions.EXPERIENCE >= 0 && roleLineCount < 1) score -= 8;
    ['SUMMARY', 'EXPERIENCE', 'SKILLS'].forEach(k => {
      if (positions[k] >= 0 && !preferredHits[k]) score -= 3;
    });
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      flags,
      orderOk: orderOk && certificationsAtEnd,
      positions,
      preferredHits,
      skillWindowCount,
      roleLineCount,
      hasCertifications: certIdx >= 0,
      certificationsAtEnd,
      contact: { nameOk, titleLineOk, hasEmail, hasPhone, hasContactRow },
      expectedOrder: [
        'Name',
        'Professional Title',
        'email | phone | LinkedIn',
        'PROFESSIONAL SUMMARY',
        'TECHNICAL SKILLS (Category: skills)',
        'PROFESSIONAL EXPERIENCE',
        'EDUCATION',
        'CERTIFICATIONS (if any — always last)',
      ],
      templateNote: 'Structure scored against the canonical resume template (Summary → Skills → Experience → Education → Certifications if any).',
    };
  }

  // ─── ATS SCORING (Jobilly readiness + RAG keywords) ─────
  // Primary score = weighted readiness:
  //   Keywords 30 · Content 25 · Parseability 20 · Structure 15 · Formatting 10 = 100
  // Keywords category is powered by our RAG primary/secondary extraction + alias match.
  function computeAtsScore(jd, resume, primary, secondary, aliasMap) {
    const resumeLines = resume.split('\n').map(l =>
      l.replace(/^[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+/, '')
       .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+$/, '')
    );
    const resumeText = resumeLines.join('\n');

    const primaryFound = primary.filter(k => kwOrAliasInText(k, resumeText, aliasMap));
    const primaryMissing = primary.filter(k => !kwOrAliasInText(k, resumeText, aliasMap));
    // Legacy detail points (kept for diagnostics / rewrite prompts — not the primary score)
    const kwPts = primary.length === 0
      ? 60
      : Math.round((primaryFound.length / primary.length) * 60);

    const secFound = secondary.filter(k => kwOrAliasInText(k, resumeText, aliasMap));
    const secMissing = secondary.filter(k => !kwOrAliasInText(k, resumeText, aliasMap));
    const secPts = secondary.length === 0
      ? 15
      : Math.round((secFound.length / secondary.length) * 15);

    // Metric scoring uses EXPERIENCE bullets only — skill-category bullets/windows are exempt
    const SKILL_SECTION_RE = /^(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|KEY SKILLS|TECHNOLOGIES)\b/i;
    const MAIN_SECTION_RE = /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|EDUCATION|ACADEMIC|CERTIFICATIONS?|LICENSES|PROJECTS|PUBLICATIONS|AWARDS|VOLUNTEER|LANGUAGES?|INTERESTS?|REFERENCES)\b/i;
    let scanSection = '';
    const bulletLines = [];
    for (const raw of resumeLines) {
      const l = (raw || '').trim();
      if (!l) continue;
      const upper = l.toUpperCase();
      if (/^[A-Z][A-Z\s\/&\-]{2,44}$/.test(upper) && upper.length < 55 && (SKILL_SECTION_RE.test(upper) || MAIN_SECTION_RE.test(upper))) {
        scanSection = upper;
        continue;
      }
      const inSkills = SKILL_SECTION_RE.test(scanSection);
      if (inSkills) continue; // skill windows/bullets never count toward metric ratio
      if (l.length < 10) continue;
      let isBullet = false;
      if (/^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25C6\u2012\u2013\u2014\u00B7\u00BB\u2192\u2794\u27A4●•·‣▸▶►○◦\*]/.test(l)) isBullet = true;
      else if (/^-\s+\S/.test(l)) isBullet = true;
      else if (/^\d{1,2}[.)]\s+\S/.test(l)) isBullet = true;
      // Plain-text achievement lines (common when pasting from Word/PDF)
      else if (/^(led|built|designed|developed|managed|created|implemented|improved|reduced|increased|delivered|owned|drove|optimized|automated|migrated|launched|scaled)\b/i.test(l) && l.length > 40) isBullet = true;
      if (isBullet) bulletLines.push(l);
    }
    const bulletsWithNum = bulletLines.filter(l => /\d/.test(l));
    let metricPts;
    if (bulletLines.length > 0) {
      metricPts = Math.round((bulletsWithNum.length / bulletLines.length) * 10);
    } else {
      // No bullets detected — still credit numbered achievements in body
      const numberedLines = resumeLines.filter(l => l.length > 40 && /\d/.test(l) && !/^(email|phone|http|www|linkedin)/i.test(l));
      metricPts = numberedLines.length >= 4 ? 7 : numberedLines.length >= 2 ? 5 : numberedLines.length >= 1 ? 3 : 2;
    }

    let jdTitle = extractJdTitle(jd).toLowerCase().replace(/[^\w\s]/g, '').trim();
    // Search first ~20 content lines so long contact headers don't tank summary score
    const summaryArea = resumeLines.filter(Boolean).slice(0, 20).join(' ').toLowerCase();
    const titleWords = jdTitle.split(/\s+/).filter(w => w.length > 3);
    const titleHits = titleWords.filter(w => summaryArea.includes(w)).length;
    const summaryPts = titleWords.length === 0 ? 5
      : titleHits >= titleWords.length ? 5
      : titleHits >= Math.ceil(titleWords.length * 0.5) ? 4
      : titleHits >= 1 ? 2 : 1;

    const upperHeaders = resumeLines.filter(l => /^[A-Z][A-Z\s\/&\-]{2,44}$/.test(l) && l.trim().length > 2);
    const titleCaseHeaders = resumeLines.filter(l =>
      /^(Summary|Professional Summary|Profile|Experience|Work Experience|Professional Experience|Skills|Technical Skills|Education|Projects|Certifications)\b/i.test(l.trim())
      && l.trim().length < 50
    );
    const hasSectionHeaders = upperHeaders.length > 0 || titleCaseHeaders.length >= 2;
    const hasBullets = bulletLines.length > 0;
    const hasTable = resumeLines.some(l => {
      const parts = l.split('|');
      if (parts.length < 4) return false;
      return !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|present)/i.test(l);
    });
    const hasColumns = (resume.match(/\t{2,}/g) || []).length > 5;
    const fmtIssues = [];
    if (!hasSectionHeaders) fmtIssues.push('No clear section headers detected');
    if (!hasBullets) fmtIssues.push('No bullet points found — ATS prefers hyphen bullets');
    if (hasTable) fmtIssues.push('Table formatting detected — may confuse ATS parsers');
    if (hasColumns) fmtIssues.push('Multi-column layout detected — use single column');
    const fmtCheck = fmtIssues.length === 0 ? 'PASS' : 'WARNING';
    const fmtPts = fmtCheck === 'PASS' ? 5 : Math.max(1, 5 - fmtIssues.length * 1);

    const REQUIRED_SECTIONS = ['SUMMARY', 'EXPERIENCE', 'SKILLS', 'EDUCATION'];
    const SECTION_ALIASES = {
      SUMMARY: ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE', 'ABOUT'],
      EXPERIENCE: ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY'],
      SKILLS: ['TECHNICAL SKILLS', 'SKILLS', 'CORE COMPETENCIES', 'TECHNOLOGIES', 'TOOLS & PLATFORMS'],
      EDUCATION: ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS'],
    };
    const resumeUpper = resume.toUpperCase();
    const missingSections = REQUIRED_SECTIONS.filter(s =>
      !(SECTION_ALIASES[s] || [s]).some(alias => resumeUpper.includes(alias))
    );
    const sectionPts = missingSections.length === 0 ? 5 : Math.max(1, 5 - missingSections.length);
    const structureAnalysis = analyzeResumeStructure(resume, resumeLines);

    const gaps = [
      ...primaryMissing.map(k => `Keyword "${k}" from JD not found in resume — add to Skills or weave into a bullet.`),
      ...secMissing.map(k => `Secondary keyword "${k}" from JD not found in resume — consider adding.`),
      ...fmtIssues.map(i => `Format: ${i}`),
      ...missingSections.map(s => `Missing section: ${s}`),
      ...(bulletLines.length > 0 && bulletsWithNum.length < bulletLines.length
        ? [`${bulletLines.length - bulletsWithNum.length} EXPERIENCE bullet(s) have no measurable metric — add counts, %, time saved, or dollar impact. (Skill-section bullets are exempt.)`]
        : []),
    ];

    const improvementSuggestions = [];
    if (primaryMissing.length) improvementSuggestions.push(`Add missing primary keywords to SKILLS: ${primaryMissing.slice(0, 3).join(', ')}`);
    if (bulletLines.length > 0 && bulletsWithNum.length < bulletLines.length) improvementSuggestions.push('Add metrics to EXPERIENCE bullets without numbers (keep skill bullets as-is)');
    if (summaryPts < 5) improvementSuggestions.push('Rewrite summary as a clear HR-friendly overview of full experience — no percentages');
    if (missingSections.length) improvementSuggestions.push(`Add missing sections: ${missingSections.join(', ')}`);

    // Jobilly readiness is the PRIMARY ATS score.
    // Our contribution: RAG keyword extraction + alias matching + JD/experience fit hooks in the UI.
    const report = buildReadinessReport({
      resume, resumeLines, resumeText, aliasMap,
      primary, secondary, primaryFound, primaryMissing, secFound, secMissing,
      bulletLines, bulletsWithNum, fmtIssues, fmtCheck, missingSections,
      summaryPts, gaps, improvementSuggestions, structureAnalysis,
    });

    const atsScore = report.overallReadiness;
    const confidence = atsScore >= 85 ? 'High' : atsScore >= 70 ? 'Medium' : 'Low';

    const scorecard = {
      atsScore,
      scoringModel: 'jobilly-readiness+rag-keywords',
      keywordMatch: primaryFound.length,
      keywordsFound: primaryFound,
      keywordsMissing: primaryMissing,
      secondaryFound: secFound,
      secondaryMissing: secMissing,
      bulletsWithMetrics: bulletsWithNum.length,
      bulletsTotal: bulletLines.length,
      summaryScore: summaryPts,
      formatCheck: fmtCheck,
      formatIssues: fmtIssues,
      sectionCheck: missingSections.length === 0 && structureAnalysis.orderOk ? 'PASS' : 'FAIL',
      missingSections,
      structureAnalysis,
      confidenceLevel: confidence,
      confidenceReason: primaryMissing.length === 0
        ? 'All major JD keywords addressed'
        : `${primaryMissing.length} primary keyword(s) still missing`,
      gaps,
      improvementSuggestions,
      categories: report.categories,
      overallReadiness: report.overallReadiness,
      readinessLabel: report.readinessLabel,
      topFixes: report.topFixes,
      reportPromptBlock: report.reportPromptBlock,
      // Legacy keyword-first breakdown (diagnostics only)
      legacyKeywordPts: { kwPts, secPts, metricPts, summaryPts, fmtPts, sectionPts },
    };

    return {
      atsScore,
      atsColour: report.readinessColour,
      kwPts, secPts, metricPts, summaryPts, fmtPts, sectionPts,
      primaryFound, primaryMissing, secFound, secMissing,
      bulletLines, bulletsWithNum, fmtCheck, fmtIssues, missingSections,
      gaps, improvementSuggestions, confidence,
      report,
      scorecard,
    };
  }

  function clampScore(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /**
   * Jobilly weighted readiness (PRIMARY ATS score):
   * Keywords 30% · Content 25% · Parseability 20% · Structure 15% · Formatting 10%
   * Keywords + Content are weighted higher so JD match and bullet quality drive the score.
   */
  function buildReadinessReport(ctx) {
    const {
      resume, resumeLines, resumeText, aliasMap,
      primary, secondary, primaryFound, primaryMissing, secFound, secMissing,
      bulletLines, bulletsWithNum, fmtIssues, missingSections,
      summaryPts, gaps, improvementSuggestions, structureAnalysis,
    } = ctx;

    const strippedLen = (resumeText || '').replace(/\s/g, '').length;
    const wordCount = (resumeText || '').trim().split(/\s+/).filter(Boolean).length;
    const parseFlags = [];
    let parseScore = 100;
    if (strippedLen < 20) {
      parseFlags.push('Near-zero extractable text — ATS will not parse this resume');
      parseScore = 5;
    } else if (strippedLen < 100) {
      parseFlags.push('Very little text extracted — parsing may be incomplete');
      parseScore -= 40;
    } else if (wordCount < 120) {
      parseFlags.push('Resume text is thin — expand experience with concrete bullets');
      parseScore -= 15;
    }
    if (fmtIssues.some(i => /table/i.test(i))) {
      parseFlags.push('Table-like formatting may scramble ATS reading order');
      parseScore -= 15;
    }
    if (fmtIssues.some(i => /column/i.test(i))) {
      parseFlags.push('Multi-column layout detected — use single column');
      parseScore -= 12;
    }
    const garbage = (resume.match(/[�□]|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
    if (garbage > 3) {
      parseFlags.push('Garbage/control characters detected in text');
      parseScore -= 8;
    }
    if (wordCount > 900) {
      parseFlags.push('Long resume (~' + wordCount + ' words) — consider trimming to 1–2 pages');
      parseScore -= 5;
    }
    parseScore = clampScore(parseScore, 0, 100);
    if (!parseFlags.length) parseFlags.push('Text looks cleanly extractable — good parseability baseline');

    const firstLine = (resumeLines.find(l => l.trim()) || '').trim();
    const nameOk = firstLine.length > 0 && firstLine.length <= 60
      && !/@|http|linkedin|phone|\d{5}/i.test(firstLine)
      && !/^(resume|curriculum vitae|cv)$/i.test(firstLine);
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(resumeText);
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);

    // Structure scored against canonical template:
    // Name → Title → Contact → PROFESSIONAL SUMMARY → TECHNICAL SKILLS → PROFESSIONAL EXPERIENCE → EDUCATION → CERTIFICATIONS (if any)
    const struct = structureAnalysis || analyzeResumeStructure(resume, resumeLines);
    let structureScore = struct.score;
    const structureFlags = [...(struct.flags || [])];
    if (summaryPts < 3) {
      structureScore = clampScore(structureScore - 5, 0, 100);
      structureFlags.push('Summary poorly aligned to JD title/role');
    }
    // Keep legacy missingSections in flags if analyzer missed an alias edge case
    missingSections.forEach(s => {
      const label = PREFERRED_SECTION_HEADERS[s] || s;
      if (!structureFlags.some(f => f.includes(label) || f.includes(s))) {
        structureFlags.push('Missing section: ' + label);
        structureScore = clampScore(structureScore - 5, 0, 100);
      }
    });
    structureScore = clampScore(structureScore, 0, 100);

    const primaryPct = primary.length ? primaryFound.length / primary.length : 1;
    const secondaryPct = secondary.length ? secFound.length / secondary.length : 1;
    // Our RAG contribution inside Keywords category (30% of overall):
    // primary coverage dominates, secondary + body-demo bonus on top.
    const skillsBlock = (resumeText.match(/(?:skills|technical skills|core competencies)[\s\S]{0,900}/i) || [''])[0];
    const bodyWithoutSkills = resumeText.toLowerCase().replace(skillsBlock.toLowerCase(), '');
    const demoPrimary = primaryFound.filter(k => kwOrAliasInText(k, bodyWithoutSkills, aliasMap));
    const demoRate = primaryFound.length ? demoPrimary.length / primaryFound.length : 0;
    let kwScore = Math.round(primaryPct * 70 + secondaryPct * 20 + demoRate * 10);
    kwScore = clampScore(kwScore, 0, 100);
    const kwFlags = [];
    if (primaryMissing.length) kwFlags.push('Missing primary: ' + primaryMissing.slice(0, 6).join(', '));
    if (secMissing.length) kwFlags.push('Missing secondary: ' + secMissing.slice(0, 4).join(', '));
    if (primaryFound.length && demoRate < 0.5) kwFlags.push('Many keywords appear only in Skills — demonstrate them in Experience bullets');

    const WEAK_OPENERS = /^(helped|assisted|responsible for|worked on|involved in|participated in|duties included)\b/i;
    const BUZZWORDS = ['synergy', 'go-getter', 'self-starter', 'detail-oriented', 'results-driven', 'passionate', 'team player', 'hard-working', 'fast-paced'];
    const quantRate = bulletLines.length
      ? Math.round((bulletsWithNum.length / bulletLines.length) * 100)
      : 0;
    const weakOpeners = bulletLines.filter(b => WEAK_OPENERS.test(b.replace(/^[\-•*]\s*/, '')));
    const buzzFound = BUZZWORDS.filter(b => resumeText.toLowerCase().includes(b));
    const firstPerson = (resumeText.match(/\b(I|my|me)\b/gi) || []).length;
    let contentScore = 100;
    const contentFlags = [];
    if (bulletLines.length && quantRate < 30) { contentScore -= 20; contentFlags.push('Only ' + quantRate + '% of experience bullets have metrics — aim for 50%+'); }
    else if (bulletLines.length && quantRate < 50) { contentScore -= 10; contentFlags.push('Quantification rate ' + quantRate + '% — add more numbers to bullets'); }
    if (weakOpeners.length > 2) { contentScore -= 10; contentFlags.push(weakOpeners.length + ' weak bullet openers (helped / responsible for / worked on)'); }
    if (firstPerson > 5) { contentScore -= 10; contentFlags.push(firstPerson + ' first-person references — use implied subject'); }
    if (buzzFound.length > 2) { contentScore -= 10; contentFlags.push('Buzzwords: ' + buzzFound.join(', ')); }
    if (!bulletLines.length) { contentScore -= 15; contentFlags.push('No clear experience bullets detected'); }
    contentScore = clampScore(contentScore, 0, 100);

    let formattingScore = 100;
    const formattingFlags = [...fmtIssues];
    fmtIssues.forEach(f => {
      formattingScore -= /table|column/i.test(f) ? 15 : 8;
    });
    formattingScore = clampScore(formattingScore, 0, 100);

    const categories = {
      parseability: { score: parseScore, weight: 0.20, flags: parseFlags },
      structure: { score: structureScore, weight: 0.15, flags: structureFlags },
      keywords: { score: kwScore, weight: 0.30, flags: kwFlags },
      content: { score: contentScore, weight: 0.25, flags: contentFlags, quantRate },
      formatting: { score: formattingScore, weight: 0.10, flags: formattingFlags },
    };

    const overallReadiness = Math.round(
      kwScore * 0.30 +
      contentScore * 0.25 +
      parseScore * 0.20 +
      structureScore * 0.15 +
      formattingScore * 0.10
    );

    const readinessLabel = overallReadiness >= 75 ? 'Strong'
      : overallReadiness >= 50 ? 'Needs improvement'
      : 'Critical gaps';

    const topFixes = [];
    if (parseScore < 70) {
      topFixes.push({
        priority: 1,
        title: parseScore <= 5 ? 'Fix parseability — ATS cannot read this resume' : 'Improve text extractability / layout',
        detail: parseFlags[0] || 'Use single-column plain text with selectable content.',
      });
    }
    if (!hasEmail) {
      topFixes.push({
        priority: 2,
        title: 'Add a professional email in the header',
        detail: 'ATS and recruiters expect an email on the first screen.',
      });
    }
    if (primaryPct < 0.5) {
      topFixes.push({
        priority: 2,
        title: 'Increase keyword match (' + Math.round(primaryPct * 100) + '%)',
        detail: 'Missing: ' + primaryMissing.slice(0, 5).join(', ') + '. Mirror JD language naturally in Skills + Experience.',
      });
    }
    if (!struct.orderOk) {
      topFixes.push({
        priority: 2,
        title: 'Fix section order to match template',
        detail: 'Use: PROFESSIONAL SUMMARY → TECHNICAL SKILLS → PROFESSIONAL EXPERIENCE → EDUCATION → CERTIFICATIONS (if any, last)',
      });
    }
    if (missingSections.length) {
      topFixes.push({
        priority: 3,
        title: 'Add missing sections',
        detail: missingSections.map(s => PREFERRED_SECTION_HEADERS[s] || s).join(', '),
      });
    }
    if (quantRate < 40 && bulletLines.length) {
      topFixes.push({
        priority: 3,
        title: 'Add metrics to bullet points',
        detail: 'Only ' + quantRate + '% of experience bullets include numbers. Add scale, %, time saved, or impact.',
      });
    }
    if (structureFlags.length && topFixes.length < 3) {
      topFixes.push({
        priority: 3,
        title: 'Strengthen resume structure',
        detail: structureFlags[0],
      });
    }
    topFixes.sort((a, b) => a.priority - b.priority);
    const top3 = topFixes.slice(0, 3);

    const reportPromptBlock = [
      'ATS READINESS REPORT — Jobilly weighted score (PRIMARY target):',
      `Overall readiness: ${overallReadiness}/100 (${readinessLabel})`,
      `Keywords ${kwScore}/100 (30% · our RAG match) · Content ${contentScore}/100 (25%) · Parseability ${parseScore}/100 (20%) · Structure ${structureScore}/100 (15%) · Formatting ${formattingScore}/100 (10%)`,
      'CANONICAL STRUCTURE (must match): Name → Title → email | phone | LinkedIn → PROFESSIONAL SUMMARY → TECHNICAL SKILLS (Category: skills) → PROFESSIONAL EXPERIENCE → EDUCATION → CERTIFICATIONS (if any, always last)',
      structureFlags.length ? 'STRUCTURE FLAGS:\n' + structureFlags.slice(0, 6).map(f => `  - ${f}`).join('\n') : 'STRUCTURE: matches canonical template',
      top3.length
        ? 'TOP FIXES (do these first):\n' + top3.map((f, i) => `  ${i + 1}. ${f.title} — ${f.detail}`).join('\n')
        : 'TOP FIXES: none critical',
      primaryMissing.length ? `MISSING PRIMARY KEYWORDS (our RAG extract): ${primaryMissing.join(', ')}` : 'PRIMARY KEYWORDS: all present',
      secMissing.length ? `MISSING SECONDARY KEYWORDS: ${secMissing.slice(0, 8).join(', ')}` : 'SECONDARY KEYWORDS: all present',
      improvementSuggestions.length
        ? 'SUGGESTIONS:\n' + improvementSuggestions.map(s => `  - ${s}`).join('\n')
        : '',
      gaps.length
        ? 'GAPS:\n' + gaps.slice(0, 12).map(g => `  - ${g}`).join('\n')
        : '',
      'Raise Overall readiness by fixing Top Fixes, embedding missing RAG keywords in Skills + Experience, and quantifying bullets.',
    ].filter(Boolean).join('\n');

    return {
      overallReadiness,
      readinessLabel,
      readinessColour: overallReadiness >= 75 ? '#4ade80' : overallReadiness >= 50 ? '#fbbf24' : '#f87171',
      categories,
      topFixes: top3,
      parseFlags,
      structureFlags,
      structureAnalysis: struct,
      contentFlags,
      reportPromptBlock,
    };
  }

  // ─── RAG CONTEXT FOR REWRITE (smaller prompts = cheaper) ────────
  function buildCompactRewriteContext(jd, resume, keywords) {
    const chunks = chunkJD(jd);
    const rulesIdx = new BM25Index(ATS_RULES_KB.map(r => ({ id: r.id, text: r.text })));
    const relevantRules = rulesIdx.search(keywords.primary.join(' '), 5).map(h => h.doc.text);

    const kwSet = new Set([...keywords.primary, ...keywords.secondary].map(k => k.toLowerCase()));
    const scoredChunks = chunks.map(c => {
      let score = 0;
      const cl = c.toLowerCase();
      for (const kw of kwSet) if (cl.includes(kw)) score += 2;
      if (/required|must|qualifications|responsibilities|skills/i.test(c)) score += 3;
      return { text: c, score };
    }).sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, 4).map(c => c.text);
    const title = extractJdTitle(jd);

    const resumePreview = resume.split('\n').filter(Boolean).slice(0, 8).join('\n');
    const baseSkills = extractSkillsFromResume(resume);
    const activeFams = [...detectActiveFamilies(baseSkills, resume.toLowerCase())];
    const familyHints = activeFams.map(f => {
      const members = (SKILL_FAMILIES[f] || []).slice(0, 10).join(', ');
      return `• ${f}: keep related originals (${members})`;
    });

    return [
      '=== RAG-RETRIEVED JD CONTEXT (most relevant sections) ===',
      title ? `ROLE TITLE: ${title}` : '',
      ...topChunks.map((c, i) => `[JD Chunk ${i + 1}]\n${c}`),
      '',
      '=== ATS RULES (from knowledge base) ===',
      ...relevantRules.map(r => `• ${r}`),
      '',
      '=== KEYWORDS TO EMBED ===',
      `PRIMARY (must appear 2x each): ${keywords.primary.join(', ')}`,
      `SECONDARY (appear 1x): ${keywords.secondary.join(', ')}`,
      '',
      '=== SKILL FAMILIES TO PRESERVE (do not strip related ecosystem skills) ===',
      ...(familyHints.length ? familyHints : ['• Keep related ecosystem skills when the anchor language remains']),
      baseSkills.length ? `BASE SKILLS DETECTED: ${baseSkills.slice(0, 40).join(', ')}` : '',
      '',
      '=== RESUME HEADER PREVIEW ===',
      resumePreview,
    ].filter(Boolean).join('\n');
  }

  // ─── INDEXEDDB CACHE ────────────────────────────────────────────
  const DB_NAME = 'ats-rag-cache';
  const STORE = 'keywords';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  }

  async function cacheSet(key, value) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* storage unavailable */ }
  }

  function sanitizeKeywordPayload(payload, source, jd) {
    // Keep only skills that survive filters — count is JD-driven, not forced to 10
    let primary = filterTechnicalKeywords(payload?.primary || [], 15);
    const demoted = (payload?.primary || []).filter(k => isSecondaryDomainKeyword(k));
    let secondary = filterSecondaryKeywords(
      [...demoted, ...(payload?.secondary || [])].filter(k => !primary.some(p => p.toLowerCase() === String(k).toLowerCase())),
      12,
      jd
    );
    if (jd) {
      primary = filterGroundedKeywords(primary, jd).filter(k =>
        !SKILL_BY_LABEL.has(String(k).toLowerCase()) || skillHasLexicalEvidence(k, jd)
      );
      secondary = filterSecondaryKeywords(secondary, 12, jd);
    }
    const aliasMap = buildAliasMap([...primary, ...secondary]);
    return {
      ...payload,
      primary,
      secondary,
      aliasMap,
      jdKeywordCount: primary.length,
      extractedFromJd: true,
      source,
    };
  }

  async function getKeywords(jd, sessionKeywords) {
    if (sessionKeywords?.primary?.length) {
      return sanitizeKeywordPayload(sessionKeywords, 'session', jd);
    }

    const key = 'ats_kw_v7_' + jdHash(jd);
    const cached = await cacheGet(key);
    if (cached?.primary?.length) {
      return sanitizeKeywordPayload(cached, 'cache', jd);
    }

    // localStorage fallback (legacy)
    try {
      const ls = JSON.parse(localStorage.getItem(key) || 'null');
      if (ls?.primary?.length) return sanitizeKeywordPayload(ls, 'cache', jd);
    } catch { /* ignore */ }

    const extracted = extractKeywordsRAG(jd);
    const payload = {
      primary: extracted.primary,
      secondary: extracted.secondary,
      aliasMap: extracted.aliasMap,
      title: extracted.title,
      confidence: extracted.confidence,
    };
    await cacheSet(key, payload);
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch { /* full */ }
    return { ...payload, source: 'rag' };
  }

  // ─── EXPERIENCE ELIGIBILITY ─────────────────────────────────────
  const MONTH_MAP = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  function parseDateToken(token) {
    if (!token) return null;
    const t = token.trim().toLowerCase();
    if (/present|current|now|today|ongoing/.test(t)) return new Date();

    const mmyyyy = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,.]?\s*((?:19|20)\d{2})\b/i);
    if (mmyyyy) {
      const mk = mmyyyy[1].slice(0, 3).toLowerCase();
      const month = MONTH_MAP[mk] ?? MONTH_MAP[mmyyyy[1].toLowerCase()] ?? 0;
      return new Date(parseInt(mmyyyy[2], 10), month, 1);
    }

    const yyyy = t.match(/\b((?:19|20)\d{2})\b/);
    if (yyyy) return new Date(parseInt(yyyy[1], 10), 0, 1);
    return null;
  }

  function extractExperienceSectionLines(resume) {
    const lines = resume.split('\n');
    const EXP_HDR = /^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT(?: HISTORY)?|CAREER(?: HISTORY)?|WORK HISTORY)$/i;
    const STOP_HDR = /^(EDUCATION|ACADEMIC(?: BACKGROUND)?|CERTIF(?:ICATIONS?)?|LICENSES|PROJECTS|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|KEY SKILLS|SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PUBLICATIONS|AWARDS|VOLUNTEER|REFERENCES|LANGUAGES?|INTERESTS?)$/i;

    let expStart = -1;
    let expEnd = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      const upper = t.toUpperCase().replace(/:$/, '');

      if (expStart === -1) {
        if (EXP_HDR.test(upper) || EXP_HDR.test(t)) expStart = i + 1;
        continue;
      }
      if (STOP_HDR.test(upper) || STOP_HDR.test(t)) {
        expEnd = i;
        break;
      }
    }

    if (expStart === -1) {
      // No EXPERIENCE header — scan whole resume but strip EDUCATION+ sections
      const out = [];
      let inBlocked = false;
      for (const line of lines) {
        const t = line.trim();
        const upper = t.toUpperCase().replace(/:$/, '');
        if (STOP_HDR.test(upper)) { inBlocked = true; continue; }
        if (EXP_HDR.test(upper)) { inBlocked = false; continue; }
        if (!inBlocked) out.push(line);
      }
      return out;
    }

    return lines.slice(expStart, expEnd);
  }

  const EDUCATION_LINE = /\b(bachelor|master|b\.?\s*s\.?|m\.?\s*s\.?|b\.?\s*tech|m\.?\s*tech|ph\.?\s*d|mba|associate|university|college|school|gpa|degree|coursework|graduated|dissertation|thesis|academic)\b/i;

  function isEducationLine(line) {
    if (!line || !line.trim()) return false;
    if (EDUCATION_LINE.test(line)) return true;
    // "2019 - 2023" with no employer/title signals — often education
    if (/\b(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present)\b/i.test(line) &&
        !/\b(inc|llc|ltd|corp|company|engineer|developer|analyst|manager|consultant|intern)\b/i.test(line) &&
        line.length < 80) {
      return EDUCATION_LINE.test(line) || /\b(b\.?s|m\.?s|b\.?a|m\.?a|b\.?e|m\.?e)\b/i.test(line);
    }
    return false;
  }

  function extractDateRanges(text) {
    const ranges = [];
    const rangeRe = /(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,.]?\s*(?:19|20)\d{2}|\b(?:19|20)\d{2}\b)\s*[-–—to]+\s*(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,.]?\s*(?:19|20)\d{2}|\b(?:19|20)\d{2}\b|present|current|now|today|ongoing)\b/gi;
    let m;
    while ((m = rangeRe.exec(text)) !== null) {
      const chunk = m[0];
      const parts = chunk.split(/\s*[-–—]|\s+to\s+/i);
      if (parts.length < 2) continue;
      const start = parseDateToken(parts[0]);
      const end = parseDateToken(parts[parts.length - 1]);
      if (start && end && end >= start) ranges.push({ start, end });
    }
    return ranges;
  }

  function extractExperienceDateRanges(resume) {
    const expLines = extractExperienceSectionLines(resume);
    const ranges = [];
    for (const line of expLines) {
      if (isEducationLine(line)) continue;
      ranges.push(...extractDateRanges(line));
    }
    return ranges;
  }

  function mergeDateRanges(ranges) {
    if (!ranges.length) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const cur = sorted[i];
      if (cur.start <= last.end) {
        if (cur.end > last.end) last.end = cur.end;
      } else {
        merged.push(cur);
      }
    }
    return merged;
  }

  function yearsBetween(start, end) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months / 12);
  }

  function extractResumeExperienceYears(resume) {
    const ranges = extractExperienceDateRanges(resume);
    const merged = mergeDateRanges(ranges);
    const totalYears = merged.reduce((sum, r) => sum + yearsBetween(r.start, r.end), 0);
    return {
      years: Math.round(totalYears * 10) / 10,
      roleCount: ranges.length,
      ranges: merged,
    };
  }

  function getLineAt(text, index) {
    const start = text.lastIndexOf('\n', index) + 1;
    const end = text.indexOf('\n', index);
    return text.slice(start, end === -1 ? text.length : end).trim();
  }

  function isPreferredLine(line) {
    return /\b(preferred|nice\s+to\s+have|bonus|a\s+plus|ideally|desired)\b/i.test(line) &&
      !/\b(required|must|minimum|mandatory|essential)\b/i.test(line);
  }

  function shortenContext(ctx, maxLen = 55) {
    const s = ctx.replace(/\s+/g, ' ').trim();
    return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
  }

  function extractJdRequiredYears(jd) {
    /** @type {{ years: number, context: string, preferred: boolean }[]} */
    const requirements = [];
    const seen = new Set();

    const addReq = (years, context, preferred) => {
      if (!years || years < 1 || years > 40) return;
      const key = years + '|' + context.toLowerCase().slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);
      requirements.push({ years, context: shortenContext(context), preferred });
    };

    const rules = [
      // "5+ years of relevant work in a data center..."
      /(\d+)\+?\s*years?\s+of\s+relevant\s+work\b[^.\n]*/gi,
      // "4+ years of vendor management experience"
      /(\d+)\+?\s*years?\s+of\s+[^.\n]{3,90}?\s*experience\b/gi,
      // "5+ years of professional / relevant experience"
      /(\d+)\+?\s*years?\s+(?:of\s+)?(?:relevant\s+|professional\s+)?experience\b[^.\n]*/gi,
      // "minimum 5 years", "at least 4 years"
      /(?:minimum|min\.?|at\s+least|least)\s*(\d+)\+?\s*years?\b[^.\n]*/gi,
      // "5+ years" / "5 + years"
      /(\d+)\s*\+\s*years?\b[^.\n]*/gi,
      // "3-5 years" / "3 to 5 years"
      /(\d+)\s*(?:to|-)\s*(\d+)\+?\s*years?\b[^.\n]*/gi,
      // "5 years in Python", "4 years with AWS"
      /(\d+)\+?\s*years?\s+(?:in|with|of)\s+[^.\n]{3,60}/gi,
    ];

    for (const re of rules) {
      let m;
      const regex = new RegExp(re.source, re.flags);
      while ((m = regex.exec(jd)) !== null) {
        const line = getLineAt(jd, m.index);
        const preferred = isPreferredLine(line);
        const context = m[0].trim();

        const a = parseInt(m[1], 10);
        addReq(a, context, preferred);

        if (m[2]) {
          const b = parseInt(m[2], 10);
          addReq(b, context + ' (range max)', preferred);
        }
      }
    }

    const required = requirements.filter(r => !r.preferred);
    const pool = required.length ? required : requirements;
    const allYears = pool.map(r => r.years);
    const strictestYears = allYears.length ? Math.max(...allYears) : 0;

    return {
      minYears: strictestYears,
      maxMention: allYears.length ? Math.max(...allYears) : 0,
      detected: requirements.length > 0,
      rawValues: [...new Set(allYears)].sort((a, b) => a - b),
      requirements,
      strictestYears,
    };
  }

  function formatJdRequirements(jdExp) {
    if (!jdExp.requirements?.length) return `${jdExp.minYears}+ years`;
    const req = jdExp.requirements.filter(r => !r.preferred);
    const list = (req.length ? req : jdExp.requirements)
      .map(r => `${r.years}+ (${r.context})`);
    if (list.length === 1) return list[0];
    return list.join(' · ') + ` — strictest: ${jdExp.strictestYears}+ years`;
  }

  function analyzeExperienceEligibility(jd, resume) {
    const jdExp = extractJdRequiredYears(jd);
    const candExp = extractResumeExperienceYears(resume);

    if (!jdExp.detected) {
      return {
        eligible: null,
        status: 'unknown',
        jdYears: 0,
        candidateYears: candExp.years,
        shortfall: 0,
        roleCount: candExp.roleCount,
        message: 'Job description does not state a clear years-of-experience requirement.',
        detail: `Candidate has ~${candExp.years} years of experience across ${candExp.roleCount} role(s).`,
      };
    }

    const shortfall = Math.max(0, jdExp.minYears - candExp.years);
    const eligible = candExp.years >= jdExp.minYears;
    const reqSummary = formatJdRequirements(jdExp);
    const multiReq = (jdExp.requirements?.filter(r => !r.preferred).length || 0) > 1;

    return {
      eligible,
      status: eligible ? 'eligible' : 'ineligible',
      jdYears: jdExp.minYears,
      jdRange: jdExp.rawValues,
      requirements: jdExp.requirements,
      reqSummary,
      candidateYears: candExp.years,
      shortfall: Math.round(shortfall * 10) / 10,
      roleCount: candExp.roleCount,
      message: eligible
        ? `Eligible — candidate has ~${candExp.years} years vs JD requirement of ${jdExp.minYears}+ years${multiReq ? ` (strictest of ${jdExp.rawValues.join(', ')}+)` : ''}.`
        : `Not eligible — candidate has ~${candExp.years} years but JD requires ${jdExp.minYears}+ years (${shortfall} year(s) short)${multiReq ? `. JD lists: ${reqSummary}` : ''}.`,
      detail: eligible
        ? 'Experience meets the strictest years requirement in the job description.'
        : 'Experience is below the job description requirement. Tailoring cannot replace required tenure.',
    };
  }


  /**
   * Career-domain detectors — used to compare JD vs resume domains.
   * Weighted signals: title hits count more than tool mentions.
   */
  const CAREER_DOMAINS = [
    {
      id: 'database_administration',
      label: 'Database Administration (DBA)',
      family: 'data',
      signals: [
        { re: /\b(database administrators?|senior dba|\bdba\b)\b/i, w: 8 },
        { re: /\b(mssql|microsoft sql server|mysql|mongodb|oracle|postgresql|postgres)\b/i, w: 3 },
        { re: /\b(stored procedures?|query tuning|index optimization|database backups?|disaster recovery|mssql job agent|aws rds|azure sql)\b/i, w: 4 },
        { re: /\b(schemas?|triggers?|replication|high[- ]availability)\b/i, w: 2 },
      ],
    },
    {
      id: 'data_engineering',
      label: 'Data Engineering',
      family: 'data',
      signals: [
        { re: /\bdata engineers?\b/i, w: 8 },
        { re: /\bdata engineering\b/i, w: 6 },
        { re: /\b(etl|elt|data pipeline|spark|hadoop|airflow|databricks|snowflake|kafka|dbt)\b/i, w: 4 },
        { re: /\b(data modeling|data migration|warehouse|lakehouse)\b/i, w: 2 },
      ],
    },
    {
      id: 'data_analytics',
      label: 'Data Analytics / BI',
      family: 'data',
      signals: [
        { re: /\b(data analysts?|business intelligence|bi developer|bi analyst)\b/i, w: 8 },
        { re: /\b(power bi|tableau|looker|qlik|data visualization)\b/i, w: 4 },
        { re: /\b(sql reporting|dashboards?|kpi)\b/i, w: 2 },
      ],
    },
    {
      id: 'software_engineering',
      label: 'Software Engineering',
      family: 'engineering',
      signals: [
        { re: /\b(software engineers?|full[- ]?stack|backend developers?|frontend developers?|web developers?)\b/i, w: 8 },
        { re: /\b(react|angular|vue|node\.?js|typescript|java|spring|\.net|c#|django|flask)\b/i, w: 3 },
        { re: /\b(rest api|microservices|ci\/cd|unit tests?|agile scrum)\b/i, w: 2 },
      ],
    },
    {
      id: 'devops_cloud',
      label: 'DevOps / Cloud',
      family: 'ops',
      signals: [
        { re: /\b(devops|sre|site reliability|cloud engineers?|platform engineers?)\b/i, w: 8 },
        { re: /\b(kubernetes|docker|terraform|ansible|jenkins|github actions|helm)\b/i, w: 4 },
        { re: /\b(aws|azure|gcp|infrastructure as code|ci\/cd)\b/i, w: 2 },
      ],
    },
    {
      id: 'it_support',
      label: 'IT Support / Systems Admin',
      family: 'ops',
      signals: [
        { re: /\b(it support|help ?desk|desktop support|system administrators?|sysadmin|service desk)\b/i, w: 8 },
        { re: /\b(itil|active directory|office 365|microsoft 365|ticketing|servicenow|hardware support)\b/i, w: 4 },
        { re: /\b(troubleshooting|end[- ]user support|workstations?)\b/i, w: 2 },
      ],
    },
    {
      id: 'cybersecurity',
      label: 'Cybersecurity',
      family: 'security',
      signals: [
        { re: /\b(cybersecurity|security analysts?|infosec|soc analysts?|penetration test)/i, w: 8 },
        { re: /\b(siem|splunk|firewall|vulnerability|iam|zero trust)\b/i, w: 4 },
      ],
    },
    {
      id: 'ai_ml',
      label: 'AI / Machine Learning',
      family: 'ai',
      signals: [
        { re: /\b(machine learning|ml engineers?|ai engineers?|data scientists?|deep learning)\b/i, w: 8 },
        { re: /\b(tensorflow|pytorch|llm|rag|langchain|nlp|mlops)\b/i, w: 4 },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing / Growth',
      family: 'business',
      signals: [
        { re: /\b(digital marketing|marketing managers?|growth marketing|seo|sem|content marketing)\b/i, w: 8 },
        { re: /\b(google ads|hubspot|campaigns?|brand marketing|social media)\b/i, w: 4 },
      ],
    },
    {
      id: 'business_sales',
      label: 'Business Development / Sales',
      family: 'business',
      signals: [
        { re: /\b(business development|account managers?|sales executives?|bdr|sdr)\b/i, w: 8 },
        { re: /\b(crm|pipeline|quota|client acquisition)\b/i, w: 3 },
      ],
    },
  ];

  function scoreCareerDomains(text) {
    const raw = String(text || '');
    if (!raw.trim()) {
      return { top: null, scores: [], all: [] };
    }
    const scored = CAREER_DOMAINS.map(d => {
      let score = 0;
      const hits = [];
      for (const s of d.signals) {
        if (s.re.test(raw)) {
          score += s.w;
          hits.push(s.re.source.slice(0, 40));
        }
      }
      return { id: d.id, label: d.label, family: d.family, score, hits };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    return {
      top: scored[0] || null,
      scores: scored.slice(0, 3),
      all: scored,
    };
  }

  function compareCareerDomains(jdText, resumeText) {
    const jdDomains = scoreCareerDomains(jdText);
    const resumeDomains = scoreCareerDomains(resumeText);
    const jdTop = jdDomains.top;
    const resumeTop = resumeDomains.top;

    let relation = 'unknown';
    let sameDomain = null;
    let summary = 'Could not confidently detect domains for both JD and resume.';

    if (jdTop && resumeTop) {
      if (jdTop.id === resumeTop.id) {
        relation = 'same';
        sameDomain = true;
        summary = 'Same domain: ' + jdTop.label;
      } else if (jdTop.family === resumeTop.family) {
        relation = 'adjacent';
        sameDomain = false;
        summary = 'Adjacent but different domains — JD: ' + jdTop.label + ' · Resume: ' + resumeTop.label;
      } else {
        relation = 'different';
        sameDomain = false;
        summary = 'Different domains — JD: ' + jdTop.label + ' · Resume: ' + resumeTop.label;
      }
    } else if (jdTop && !resumeTop) {
      relation = 'unknown';
      summary = 'JD domain: ' + jdTop.label + ' · Resume domain unclear';
    } else if (!jdTop && resumeTop) {
      relation = 'unknown';
      summary = 'Resume domain: ' + resumeTop.label + ' · JD domain unclear';
    }

    return {
      relation,
      sameDomain,
      summary,
      jd: {
        label: jdTop?.label || 'Unknown',
        id: jdTop?.id || null,
        score: jdTop?.score || 0,
        alternatives: jdDomains.scores.slice(1).map(s => s.label),
      },
      resume: {
        label: resumeTop?.label || 'Unknown',
        id: resumeTop?.id || null,
        score: resumeTop?.score || 0,
        alternatives: resumeDomains.scores.slice(1).map(s => s.label),
      },
    };
  }

  /**
   * First-pass gate: is this resume a reasonable fit for the JD?
   * Combines technical keyword overlap + years-of-experience eligibility.
   * Tailoring cannot invent a career domain — unsuitable resumes should be warned early.
   */
  function analyzeJdSuitability(jd, resume, primary, secondary, aliasMap) {
    const prim = Array.isArray(primary) ? primary : [];
    const sec = Array.isArray(secondary) ? secondary : [];
    const map = aliasMap || Object.fromEntries([...prim, ...sec].map(k => [k, [k]]));
    const resumeText = resume || '';

    const primaryFound = prim.filter(k => kwOrAliasInText(k, resumeText, map));
    const primaryMissing = prim.filter(k => !kwOrAliasInText(k, resumeText, map));
    const secFound = sec.filter(k => kwOrAliasInText(k, resumeText, map));

    const primaryTotal = Math.max(prim.length, 1);
    const matchRatio = prim.length === 0 ? 0 : primaryFound.length / prim.length;
    const matchPct = Math.round(matchRatio * 100);

    let skillLevel = 'poor';
    if (matchRatio >= 0.4 || primaryFound.length >= 4) skillLevel = 'strong';
    else if (matchRatio >= 0.2 || primaryFound.length >= 2) skillLevel = 'weak';

    const experience = analyzeExperienceEligibility(jd, resume);
    const domains = compareCareerDomains(jd, resumeText);

    // Overall suitability
    let status = 'partial';
    let suitable = null;
    let title = 'Partial fit — tailor with care';
    let message = '';
    let detail = '';

    if (domains.relation === 'different') {
      status = 'unsuitable';
      suitable = false;
      title = 'Different domains';
      message = domains.summary;
      detail = `Skill overlap ${primaryFound.length}/${prim.length || 0} (${matchPct}%). AI tailor cannot invent ${domains.jd.label} career experience from a ${domains.resume.label} resume.`;
    } else if (skillLevel === 'poor') {
      status = 'unsuitable';
      suitable = false;
      title = 'Not suitable for this JD';
      message = `Resume matches only ${primaryFound.length}/${prim.length || 0} primary technical skills (${matchPct}%). Domain overlap is too low — AI tailor cannot invent missing career skills.` +
        (domains.jd.label !== 'Unknown' || domains.resume.label !== 'Unknown' ? ` (${domains.summary})` : '');
      detail = 'Choose a JD closer to the candidate’s stack, or use a resume that already covers the core technologies.';
    } else if (domains.relation === 'adjacent') {
      status = 'partial';
      suitable = null;
      title = 'Adjacent domains — partial fit';
      message = `${domains.summary} · Skills: ${primaryFound.length}/${prim.length} primary (${matchPct}%).`;
      detail = skillLevel === 'strong'
        ? `Related career track with good skill overlap — tailor carefully; do not invent pure ${domains.jd.label} tenure.`
        : 'Domains are related but not the same role track — tailor only truthful adjacent skills.';
    } else if (experience.status === 'ineligible' && skillLevel !== 'strong') {
      status = 'unsuitable';
      suitable = false;
      title = 'Not suitable — experience + skills gap';
      message = `Years shortfall (${experience.candidateYears}/${experience.jdYears}+) and weak skill overlap (${primaryFound.length}/${prim.length} primary).`;
      detail = experience.detail;
    } else if (skillLevel === 'strong' && experience.status !== 'ineligible') {
      status = 'suitable';
      suitable = true;
      title = domains.relation === 'same' ? 'Suitable — same domain' : 'Suitable for this JD';
      message = (domains.relation === 'same' ? `${domains.summary}. ` : '') +
        `Strong technical overlap — ${primaryFound.length}/${prim.length} primary skills found (${matchPct}%).` +
        (experience.status === 'eligible'
          ? ` Experience also meets the ${experience.jdYears}+ year requirement.`
          : experience.status === 'unknown'
            ? ' Years requirement not clearly stated in the JD.'
            : '');
      detail = 'Proceed with ATS scoring and AI tailor to close remaining keyword gaps.';
    } else if (experience.status === 'ineligible' && skillLevel === 'strong') {
      status = 'partial';
      suitable = null;
      title = 'Skills fit, but experience may block';
      message = `Technical skills look aligned (${primaryFound.length}/${prim.length}), but JD requires ${experience.jdYears}+ years and candidate has ~${experience.candidateYears}.`;
      detail = 'Tailoring can add keywords but cannot replace required tenure — apply only if the employer is flexible.';
    } else {
      status = 'partial';
      suitable = null;
      title = 'Partial fit — some skill gaps';
      message = `Resume matches ${primaryFound.length}/${prim.length} primary technical skills (${matchPct}%). Tailoring can help if the missing skills are truthful stretch/adjacent skills.` +
        (domains.relation !== 'unknown' ? ` ${domains.summary}.` : '');
      detail = primaryMissing.length
        ? `Missing primaries: ${primaryMissing.slice(0, 5).join(', ')}${primaryMissing.length > 5 ? '…' : ''}`
        : 'Close remaining gaps carefully without inventing experience.';
    }

    return {
      suitable,
      status, // suitable | partial | unsuitable
      title,
      message,
      detail,
      skillLevel,
      matchPct,
      skillMatchScore: matchPct, // found / JD-extracted count
      primaryFound,
      primaryMissing,
      primaryTotal: prim.length,
      jdExtractedCount: prim.length,
      secondaryFoundCount: secFound.length,
      secondaryTotal: sec.length,
      experience,
      domains,
      allowTailor: true, // never block AI Tailor — fit is advisory only
      recommendTailor: status === 'suitable' || status === 'partial',
    };
  }

  // ─── SKILLS EXTRACTION & COMPARE ────────────────────────────────
  const SKILL_SECTION_HEADERS = [
    'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'KEY SKILLS',
    'TOOLS & PLATFORMS', 'TECHNICAL SKILLS:', 'TOOLS & PLATFORMS:',
    'METHODOLOGIES:', 'CORE COMPETENCIES:',
  ];

  function normalizeSkill(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function extractSkillsFromResume(resume) {
    const lines = resume.split('\n').map(l => l.trim()).filter(Boolean);
    const skills = new Map();
    let inSkills = false;

    for (const line of lines) {
      const upper = line.toUpperCase();
      const isHeader = /^[A-Z][A-Z\s\/&:\-]{2,50}$/.test(upper) && upper.length < 55;

      if (isHeader) {
        const headerKey = upper.replace(/:$/, '').trim();
        inSkills = SKILL_SECTION_HEADERS.some(h => headerKey === h || headerKey.startsWith(h.replace(':', '')));
        if (inSkills && /:/.test(line)) {
          const afterColon = line.split(':').slice(1).join(':').trim();
          if (afterColon) parseSkillLine(afterColon, skills);
        }
        continue;
      }

      if (!inSkills) continue;

      if (isHeader && !SKILL_SECTION_HEADERS.some(h => upper.startsWith(h.replace(':', '')))) break;

      // Any skill category window — not limited to four fixed labels
      const windowMatch = line.match(/^(?:[-•]\s*)?([A-Za-z][A-Za-z0-9 &\/\+]{1,45}):\s*(.*)$/);
      if (windowMatch) {
        const afterColon = (windowMatch[2] || '').trim();
        if (afterColon) parseSkillLine(afterColon, skills);
        continue;
      }

      if (!/^[A-Z][A-Z\s\/&\-]{2,44}$/.test(upper)) {
        parseSkillLine(line, skills);
      }
    }

    return [...skills.values()];
  }

  function parseSkillLine(line, skillsMap) {
    line.split(/[,;|•·]/).forEach(part => {
      let s = part.trim()
        .replace(/^[-•*]\s*/, '')
        // Strip any "Category:" prefix so Soft Skills / Databases / etc. don't become fake skills
        .replace(/^[A-Za-z][A-Za-z0-9 &\/\+]{1,45}:\s*/i, '');
      if (s.length < 2 || s.length > 60) return;
      if (/^\d+$/.test(s)) return;
      const key = normalizeSkill(s);
      if (!skillsMap.has(key)) skillsMap.set(key, s);
    });
  }

  function skillMatchesMember(skillNorm, member) {
    const m = member.toLowerCase().trim();
    if (!m || !skillNorm) return false;
    return skillNorm === m || skillNorm.includes(m) || m.includes(skillNorm);
  }

  function familiesForSkill(skill) {
    const sn = normalizeSkill(skill);
    const families = [];
    for (const [fam, members] of Object.entries(SKILL_FAMILIES)) {
      if (members.some(m => skillMatchesMember(sn, m))) families.push(fam);
    }
    return families;
  }

  function detectActiveFamilies(skillsList, textLower) {
    const active = new Set();
    const norms = (skillsList || []).map(normalizeSkill);
    for (const [fam, members] of Object.entries(SKILL_FAMILIES)) {
      const hit = members.some(m =>
        norms.some(s => skillMatchesMember(s, m)) ||
        (textLower && textLower.includes(m.trim()))
      );
      if (hit) active.add(fam);
    }
    return active;
  }

  /**
   * Re-add original skills dropped during tailoring when they belong to an
   * active family still present on the tailored resume (or still JD-relevant).
   * Example: Python kept → restore Flask, NumPy, PyTorch, NLP, LLM from original.
   */
  function preserveRelatedSkills(originalResume, tailoredResume, jd) {
    if (!originalResume || !tailoredResume) return tailoredResume || '';
    const cmp = compareSkills(originalResume, tailoredResume);
    if (!cmp.removed.length) return tailoredResume;

    const tailoredLower = tailoredResume.toLowerCase();
    const jdLower = (jd || '').toLowerCase();
    const active = detectActiveFamilies(cmp.after, tailoredLower);

    // Also activate families that appear in BOTH original resume and JD
    for (const [fam, members] of Object.entries(SKILL_FAMILIES)) {
      const inOrig = members.some(m => cmp.before.some(s => skillMatchesMember(normalizeSkill(s), m)));
      const inJd = members.some(m => jdLower.includes(m.trim()));
      if (inOrig && inJd) active.add(fam);
    }

    if (!active.size) return tailoredResume;

    const toRestore = cmp.removed.filter(skill => {
      const fams = familiesForSkill(skill);
      return fams.some(f => active.has(f));
    });
    if (!toRestore.length) return tailoredResume;

    return appendSkillsToTechnicalLine(tailoredResume, toRestore);
  }

  /**
   * Strip JD marketing fluff / hiring-company names that models sometimes paste into SUMMARY.
   */
  function sanitizeSummaryFluff(resumeText, jd) {
    if (!resumeText) return resumeText || '';
    const lines = resumeText.split('\n');
    let inSummary = false;
    let summaryStart = -1;
    let summaryEnd = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const u = lines[i].trim().toUpperCase();
      if (/^(SUMMARY|PROFESSIONAL SUMMARY|PROFILE|OBJECTIVE)\b/.test(u) && u.length < 40) {
        inSummary = true;
        summaryStart = i + 1;
        continue;
      }
      if (inSummary && /^(SKILLS|TECHNICAL SKILLS|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS)\b/.test(u) && u.length < 55) {
        summaryEnd = i;
        break;
      }
    }
    if (summaryStart < 0) return resumeText;

    // Employer names often appear in JD headers / signatures
    const companyHints = [];
    const jdLines = (jd || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8);
    for (const jl of jdLines) {
      if (/herman|miller|knoll|inc\.|llc|corp|company/i.test(jl) && jl.length < 60) {
        const name = jl.replace(/[^a-zA-Z0-9\s&.\-]/g, '').trim();
        if (name.length >= 4) companyHints.push(name);
      }
    }
    // Always strip common offenders from this JD family
    ['HermanMiller', 'Herman Miller', 'MillerKnoll', 'Miller Knoll', 'Why join us', 'Why Join Us', 'About the job', 'About the Job']
      .forEach(n => companyHints.push(n));

    for (let i = summaryStart; i < summaryEnd; i++) {
      let line = lines[i];
      line = line.replace(/^\s*Why join us\??\s*/i, '');
      line = line.replace(/^\s*About the job\s*/i, '');
      for (const co of companyHints) {
        if (!co) continue;
        const re = new RegExp('\\b' + co.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        line = line.replace(re, '');
      }
      // Summary must stay HR-readable — strip percentages (keep metrics in Experience only)
      line = line.replace(/\bby\s+\d+(?:\.\d+)?\s*%/gi, '');
      line = line.replace(/\bof\s+\d+(?:\.\d+)?\s*%/gi, '');
      line = line.replace(/\b\d+(?:\.\d+)?\s*%/g, '');
      line = line.replace(/\b\d+(?:\.\d+)?\s*percent(?:age)?s?\b/gi, '');
      // Fix dangling "at Company" leftovers after company strip
      line = line.replace(/\bat\s*[.,;:]/gi, '.').replace(/\bat\s*$/i, '');
      line = line.replace(/\s+at\s+while/gi, ' while').replace(/\s+at\s+to\b/gi, ' to');
      line = line.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
      lines[i] = line;
    }
    return lines.join('\n');
  }

  function appendSkillsToTechnicalLine(resumeText, skillsToAdd) {
    if (!skillsToAdd.length) return resumeText;
    const lines = resumeText.split('\n');
    let skillsIdx = -1;
    let techLineIdx = -1;
    let insertAfter = -1;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      const u = raw.toUpperCase();
      const isSkillSubLabel = /^(?:[-•]\s*)?[A-Za-z][A-Za-z0-9 &\/\+]{1,45}:\s*/.test(raw)
        && !/^(summary|experience|education|projects|certifications)\s*:/i.test(raw);

      if (skillsIdx >= 0 && isSkillSubLabel) {
        if (/^(?:[-•]\s*)?technical skills\s*:/i.test(raw)) techLineIdx = i;
        insertAfter = i;
        continue;
      }
      if (/^(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|KEY SKILLS)\b/.test(u) && u.length < 55 && !/:\s*\S/.test(raw)) {
        skillsIdx = i;
        insertAfter = i;
        continue;
      }
      if (skillsIdx >= 0) {
        if (/^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|SUMMARY)\b/.test(u) && u.length < 55) break;
        if (raw) insertAfter = i;
      }
    }

    const existingLower = resumeText.toLowerCase();
    const uniqueAdd = skillsToAdd.filter(s => !existingLower.includes(s.toLowerCase()));
    if (!uniqueAdd.length) return resumeText;
    const toAdd = uniqueAdd.join(', ');

    if (techLineIdx >= 0) {
      const line = lines[techLineIdx];
      const m = line.match(/^([^:]+:\s*)(.*)$/);
      if (m) {
        const existing = m[2].trim();
        lines[techLineIdx] = existing ? `${m[1]}${existing}, ${toAdd}` : `${m[1]}${toAdd}`;
      } else {
        lines[techLineIdx] = `${line}, ${toAdd}`;
      }
    } else if (skillsIdx >= 0) {
      lines.splice(skillsIdx + 1, 0, `Technical Skills: ${toAdd}`);
    } else if (insertAfter >= 0) {
      lines.splice(insertAfter + 1, 0, 'SKILLS', `Technical Skills: ${toAdd}`);
    } else {
      lines.push('', 'SKILLS', `Technical Skills: ${toAdd}`);
    }
    return lines.join('\n');
  }

  function compareSkills(beforeResume, afterResume) {
    const beforeList = extractSkillsFromResume(beforeResume);
    const afterList = extractSkillsFromResume(afterResume);
    const beforeSet = new Set(beforeList.map(normalizeSkill));
    const afterSet = new Set(afterList.map(normalizeSkill));

    const added = afterList.filter(s => !beforeSet.has(normalizeSkill(s)));
    const removed = beforeList.filter(s => !afterSet.has(normalizeSkill(s)));
    const unchanged = afterList.filter(s => beforeSet.has(normalizeSkill(s)));

    return {
      before: beforeList,
      after: afterList,
      added,
      removed,
      unchanged,
      addedCount: added.length,
      beforeCount: beforeList.length,
      afterCount: afterList.length,
    };
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────
  const RAGEngine = {
    extractKeywordsRAG,
    computeAtsScore,
    buildReadinessReport,
    buildCompactRewriteContext,
    getKeywords,
    jdHash,
    cacheGet,
    cacheSet,
    SKILL_KB,
    SKILL_FAMILIES,
    analyzeExperienceEligibility,
    analyzeJdSuitability,
    analyzeResumeStructure,
    compareCareerDomains,
    scoreCareerDomains,
    extractSkillsFromResume,
    compareSkills,
    preserveRelatedSkills,
    sanitizeSummaryFluff,
    familiesForSkill,
    isJobRoleKeyword,
    filterTechnicalKeywords,
    skillGroundedInJd,
    sanitizeKeywordPayload,
  };

  global.RAGEngine = RAGEngine;
})(typeof window !== 'undefined' ? window : globalThis);
