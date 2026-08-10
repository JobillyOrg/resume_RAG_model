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
    { label: 'NoSQL', terms: ['mongodb', 'dynamodb', 'cassandra', 'redis', 'elasticsearch', 'cosmos db', 'neo4j'] },
    { label: 'AWS', terms: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'rds', 'eks', 'cloudformation', 'serverless', 'sagemaker', 'cloudwatch'] },
    { label: 'Azure', terms: ['azure', 'microsoft azure', 'azure devops', 'azure functions', 'event hubs', 'azure ml', 'bicep', 'aks'] },
    { label: 'GCP', terms: ['gcp', 'google cloud', 'bigquery', 'cloud run', 'gke', 'pubsub'] },
    { label: 'Docker', terms: ['docker', 'containerization', 'containers', 'dockerfile'] },
    { label: 'Kubernetes', terms: ['kubernetes', 'k8s', 'helm', 'eks', 'aks', 'gke', 'yaml manifests'] },
    { label: 'CI/CD', terms: ['ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'azure devops', 'continuous integration', 'continuous deployment', 'argo cd'] },
    { label: 'Terraform', terms: ['terraform', 'infrastructure as code', 'iac', 'azure bicep', 'pulumi', 'ansible', 'chef', 'puppet'] },
    { label: 'Machine Learning', terms: ['machine learning', 'ml', 'deep learning', 'neural network', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'xgboost', 'hyperparameter tuning', 'feature engineering', 'computer vision', 'opencv'] },
    { label: 'LLM', terms: ['llm', 'llms', 'large language model', 'gpt', 'chatgpt', 'openai', 'openai api', 'claude', 'gemini', 'prompt engineering'] },
    { label: 'RAG', terms: ['rag', 'retrieval augmented generation', 'vector database', 'embeddings', 'semantic search', 'vector store', 'pinecone', 'weaviate', 'chroma'] },
    { label: 'LangChain', terms: ['langchain', 'langgraph', 'llamaindex', 'haystack'] },
    { label: 'NLP', terms: ['nlp', 'natural language processing', 'spacy', 'hugging face', 'transformers', 'bert', 'tokenization', 'named entity recognition'] },
    { label: 'AI Engineer', terms: ['ai engineer', 'ml engineer', 'machine learning engineer', 'ai/ml', 'ai assisted development', 'generative ai'] },
    { label: 'MLOps', terms: ['mlops', 'model deployment', 'model serving', 'feature store', 'model monitoring', 'mlflow', 'kubeflow'] },
    { label: 'AutoGen', terms: ['autogen', 'multi-agent', 'agentic ai', 'ai agents', 'crewai'] },
    { label: 'Code Generation', terms: ['code generation', 'github copilot', 'copilot', 'generative ai', 'cursor'] },
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
    { label: 'IT Support', terms: ['it support', 'help desk', 'desktop support', 'troubleshooting', 'active directory', 'office 365', 'microsoft 365', 'hardware support', 'ticketing', 'service now', 'servicenow'] },
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
    { label: 'Architecture', terms: ['architecture', 'revit', 'bim', 'building design', 'construction documents'] },
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
    { id: 'format-headers', text: 'Use ALL CAPS section headers SUMMARY SKILLS EXPERIENCE EDUCATION plain text single column' },
    { id: 'format-bullets', text: 'Use hyphen bullets avoid tables columns icons special unicode' },
    { id: 'sections', text: 'Required sections SUMMARY SKILLS EXPERIENCE EDUCATION must all be present' },
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

  function filterTechnicalKeywords(list, limit = 10) {
    const out = [];
    for (const kw of list || []) {
      if (!kw || typeof kw !== 'string') continue;
      const cleaned = kw.trim();
      if (!cleaned || cleaned.length < 2) continue;
      if (STOP_TERMS.has(cleaned.toLowerCase())) continue;
      if (isJobRoleKeyword(cleaned)) continue;
      // Drop soft/generic non-tech fluff that sometimes leaks from JD prose
      if (/^(communication|leadership|teamwork|collaboration|problem solving|critical thinking)$/i.test(cleaned)) continue;
      if (/^(hiring|experience|experiences?|requirements?|responsibilities|qualifications?|about|overview)$/i.test(cleaned)) continue;
      if (/[.!?]$/.test(cleaned) && cleaned.split(/\s+/).length <= 2) continue;
      if (out.some(u => u.toLowerCase() === cleaned.toLowerCase())) continue;
      out.push(cleaned);
      if (out.length >= limit) break;
    }
    return out;
  }

  function extractDirectTerms(jd) {
    const found = new Map();
    const add = (term, weight) => {
      const t = term.trim();
      if (t.length < 2 || t.length > 50) return;
      if (STOP_TERMS.has(t.toLowerCase())) return;
      if (isJobRoleKeyword(t)) return;
      const key = t.toLowerCase();
      found.set(key, { term: t, weight: (found.get(key)?.weight || 0) + weight });
    };

    // Comma / bullet lists in requirements sections
    const listLines = jd.split('\n').filter(l =>
      /^[\-•*▸]/.test(l.trim()) || /,/.test(l)
    );
    for (const line of listLines) {
      line.replace(/^[\-•*▸]\s*/, '').split(/[,;|]/).forEach(p => add(p.trim(), 3));
    }

    // Capitalized tech tokens (C#, Node.js, AWS)
    const techMatches = jd.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[A-Z]{2,}(?:\/[A-Z]+)?|C#|\.NET)\b/g) || [];
    techMatches.forEach(t => add(t, 2));

    // Quoted terms
    const quoted = jd.match(/"([^"]{2,40})"|'([^']{2,40})'/g) || [];
    quoted.forEach(q => add(q.replace(/['"]/g, ''), 4));

    // Years experience patterns nearby skills
    const yrCtx = jd.match(/(\d+)\+?\s*years?\s+(?:of\s+)?([a-z][a-z\s/+#.]{2,30})/gi) || [];
    yrCtx.forEach(m => {
      const skill = m.replace(/^\d+\+?\s*years?\s+(?:of\s+)?/i, '').trim();
      add(skill, 5);
    });

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
        const prev = scored.get(label) || 0;
        scored.set(label, prev + hit.score * mult);
      }
    }

    // Full-JD BM25 pass
    bm25.search(jd, 20).forEach(hit => {
      const label = hit.doc.label;
      scored.set(label, (scored.get(label) || 0) + hit.score * 0.5);
    });

    // Direct JD term extraction
    for (const { term, weight } of extractDirectTerms(jd)) {
      const key = term.replace(/\b\w/g, c => c); // preserve casing for display
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
      .filter(label => !isJobRoleKeyword(label));

    // Dedupe similar
    const unique = [];
    for (const kw of ranked) {
      const kl = kw.toLowerCase();
      if (unique.some(u => u.toLowerCase() === kl || u.toLowerCase().includes(kl) || kl.includes(u.toLowerCase()))) continue;
      unique.push(kw);
    }

    let primary = filterTechnicalKeywords(unique, 10);
    let secondary = filterTechnicalKeywords(unique.filter(k => !primary.some(p => p.toLowerCase() === k.toLowerCase())), 10);

    // Pad from direct terms if short
    if (primary.length < 8) {
      for (const { term } of extractDirectTerms(jd)) {
        if (primary.length >= 10) break;
        if (isJobRoleKeyword(term)) continue;
        if (!primary.some(p => p.toLowerCase() === term.toLowerCase())) primary.push(term);
      }
    }

    const aliasMap = buildAliasMap([...primary, ...secondary]);

    return {
      primary,
      secondary,
      aliasMap,
      title,
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

  // ─── ATS SCORING ────────────────────────────────────────────────
  // Rubric (keyword-first, mirrors real ATS weight):
  //   Primary keywords 60 · Secondary 15 · Metrics 10 · Summary 5 · Format 5 · Sections 5 = 100
  function computeAtsScore(jd, resume, primary, secondary, aliasMap) {
    const resumeLines = resume.split('\n').map(l =>
      l.replace(/^[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+/, '')
       .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\u202F\u2060\u3000]+$/, '')
    );
    const resumeText = resumeLines.join('\n');

    const primaryFound = primary.filter(k => kwOrAliasInText(k, resumeText, aliasMap));
    const primaryMissing = primary.filter(k => !kwOrAliasInText(k, resumeText, aliasMap));
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
    const resumeUpper = resume.toUpperCase();
    const SECTION_ALIASES = {
      SUMMARY: ['SUMMARY', 'PROFILE', 'OBJECTIVE', 'ABOUT'],
      EXPERIENCE: ['EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE'],
      SKILLS: ['SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'TECHNOLOGIES'],
      EDUCATION: ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS'],
    };
    const missingSections = REQUIRED_SECTIONS.filter(s =>
      !(SECTION_ALIASES[s] || [s]).some(alias => resumeUpper.includes(alias))
    );
    const sectionPts = missingSections.length === 0 ? 5 : Math.max(1, 5 - missingSections.length);

    const atsScore = Math.min(100, kwPts + secPts + metricPts + summaryPts + fmtPts + sectionPts);
    const confidence = atsScore >= 85 ? 'High' : atsScore >= 70 ? 'Medium' : 'Low';

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

    return {
      atsScore,
      atsColour: atsScore >= 80 ? '#4ade80' : atsScore >= 60 ? '#fbbf24' : '#f87171',
      kwPts, secPts, metricPts, summaryPts, fmtPts, sectionPts,
      primaryFound, primaryMissing, secFound, secMissing,
      bulletLines, bulletsWithNum, fmtCheck, fmtIssues, missingSections,
      gaps, improvementSuggestions, confidence,
      scorecard: {
        atsScore,
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
        sectionCheck: missingSections.length === 0 ? 'PASS' : 'FAIL',
        missingSections,
        confidenceLevel: confidence,
        confidenceReason: primaryMissing.length === 0
          ? 'All major JD keywords addressed'
          : `${primaryMissing.length} primary keyword(s) still missing`,
        gaps,
        improvementSuggestions,
      },
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

  function sanitizeKeywordPayload(payload, source) {
    const primary = filterTechnicalKeywords(payload?.primary || [], 10);
    const secondary = filterTechnicalKeywords(
      (payload?.secondary || []).filter(k => !primary.some(p => p.toLowerCase() === String(k).toLowerCase())),
      10
    );
    const aliasMap = buildAliasMap([...primary, ...secondary]);
    return {
      ...payload,
      primary,
      secondary,
      aliasMap,
      source,
    };
  }

  async function getKeywords(jd, sessionKeywords) {
    if (sessionKeywords?.primary?.length) {
      return sanitizeKeywordPayload(sessionKeywords, 'session');
    }

    const key = 'ats_kw_v2_' + jdHash(jd);
    const cached = await cacheGet(key);
    if (cached?.primary?.length) {
      return sanitizeKeywordPayload(cached, 'cache');
    }

    // localStorage fallback (legacy)
    try {
      const ls = JSON.parse(localStorage.getItem(key) || 'null');
      if (ls?.primary?.length) return sanitizeKeywordPayload(ls, 'cache');
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

    // Overall suitability
    let status = 'partial';
    let suitable = null;
    let title = 'Partial fit — tailor with care';
    let message = '';
    let detail = '';

    if (skillLevel === 'poor') {
      status = 'unsuitable';
      suitable = false;
      title = 'Not suitable for this JD';
      message = `Resume matches only ${primaryFound.length}/${prim.length || 0} primary technical skills (${matchPct}%). Domain overlap is too low — AI tailor cannot invent missing career skills.`;
      detail = 'Choose a JD closer to the candidate’s stack, or use a resume that already covers the core technologies.';
    } else if (experience.status === 'ineligible' && skillLevel !== 'strong') {
      status = 'unsuitable';
      suitable = false;
      title = 'Not suitable — experience + skills gap';
      message = `Years shortfall (${experience.candidateYears}/${experience.jdYears}+) and weak skill overlap (${primaryFound.length}/${prim.length} primary).`;
      detail = experience.detail;
    } else if (skillLevel === 'strong' && experience.status !== 'ineligible') {
      status = 'suitable';
      suitable = true;
      title = 'Suitable for this JD';
      message = `Strong technical overlap — ${primaryFound.length}/${prim.length} primary skills found (${matchPct}%).` +
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
      message = `Resume matches ${primaryFound.length}/${prim.length} primary technical skills (${matchPct}%). Tailoring can help if the missing skills are truthful stretch/adjacent skills.`;
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
      primaryFound,
      primaryMissing,
      primaryTotal: prim.length,
      secondaryFoundCount: secFound.length,
      secondaryTotal: sec.length,
      experience,
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
    buildCompactRewriteContext,
    getKeywords,
    jdHash,
    cacheGet,
    cacheSet,
    SKILL_KB,
    SKILL_FAMILIES,
    analyzeExperienceEligibility,
    analyzeJdSuitability,
    extractSkillsFromResume,
    compareSkills,
    preserveRelatedSkills,
    sanitizeSummaryFluff,
    familiesForSkill,
    isJobRoleKeyword,
    filterTechnicalKeywords,
    sanitizeKeywordPayload,
  };

  global.RAGEngine = RAGEngine;
})(typeof window !== 'undefined' ? window : globalThis);
