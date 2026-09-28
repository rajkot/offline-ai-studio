/**
 * Scientific Agent Skills Engine
 * 
 * Inspired by K-Dense-AI/scientific-agent-skills.
 * Implements 165+ validated research capabilities, scientific database connectors,
 * computational biology, cheminformatics, physics, deep learning experiments,
 * and literature synthesis protocols for AI coding agents.
 */

export type ScientificDomain =
  | 'bioinformatics'
  | 'cheminformatics'
  | 'physics_math'
  | 'statistics_data'
  | 'ml_deeplearning'
  | 'literature_synthesis';

export interface ScientificSkillDefinition {
  id: string;
  name: string;
  domain: ScientificDomain;
  domainLabel: string;
  domainColor: string;
  icon: string;
  description: string;
  databaseAccess: string[];
  requiredTools: string[];
  systemPrompt: string;
  exampleQueries: string[];
  workflowSteps?: string[];
  version?: string;
  author?: string;
}

export interface ScientificDomainCategory {
  id: ScientificDomain;
  label: string;
  color: string;
  icon: string;
  count: number;
}

export class ScientificSkillsEngine {
  private skills: Map<string, ScientificSkillDefinition> = new Map();
  private isLoaded = false;
  private activeSkillId: string = 'bio-crispr-guide-design';

  constructor() {
    this.initDefaultSkills();
    this.ensureServerDirectoryScanned();
  }

  private initDefaultSkills(): void {
    if (this.isLoaded) return;

    const definitions: ScientificSkillDefinition[] = [
      // 1. BIOINFORMATICS & GENOMICS
      {
        id: 'bio-crispr-guide-design',
        name: 'CRISPR-Cas9 sgRNA Guide Designer',
        domain: 'bioinformatics',
        domainLabel: 'Bioinformatics & Genomics',
        domainColor: '#10B981',
        icon: 'Dna',
        description: 'Designs high-specificity on-target sgRNAs with PAM site identification (NGG) and CFD off-target score minimization.',
        databaseAccess: ['NCBI RefSeq', 'Ensembl Genome', 'CRISPR-Casdb'],
        requiredTools: ['python_repl', 'file_read', 'calculator'],
        systemPrompt: `You are an elite Computational Biologist and CRISPR Genome Engineering Specialist.
When designing sgRNA guides:
1. Scan target sequence (5' -> 3') for SpCas9 PAM sites (5'-NGG-3').
2. Extract 20-nt protospacer sequences immediately 5' of the PAM.
3. Compute GC-content (ideal 40% - 60%), poly-T penalty (>= 4 consecutive Ts termination signal), and CFD off-target matrix scores.
4. Output structured tables with: Sequence, Genomic Coordinates, Strand (+/-), On-target Efficiency Score, and Predicted Off-targets.`,
        exampleQueries: [
          'Design 3 high-specificity sgRNA guides targeting exon 2 of human TP53 (ENSG00000141510).',
          'Calculate CFD off-target penalty for sgRNA 5-GCGTGTCCCGTGTGGCCCCT-3 with 1 mismatch in seed region.'
        ],
        workflowSteps: ['Extract FASTA exon sequence', 'Find 5-NGG-3 PAM matches', 'Filter out poly-T tracts', 'Score specificity & off-target CFD matrix']
      },
      {
        id: 'bio-rnaseq-pipeline',
        name: 'RNA-Seq Differential Expression & DESeq2 Pipeline',
        domain: 'bioinformatics',
        domainLabel: 'Bioinformatics & Genomics',
        domainColor: '#10B981',
        icon: 'Activity',
        description: 'Automates raw count normalization, dispersion estimation, Wald test differential expression, and volcano plot synthesis.',
        databaseAccess: ['GEO (Gene Expression Omnibus)', 'Ensembl', 'STRING-DB'],
        requiredTools: ['python_repl', 'file_write', 'diagram'],
        systemPrompt: `You are an expert RNA-Seq and Transcriptomics Bioinformatician.
Execute reproducible DESeq2/EdgeR pipelines:
1. Perform size factor normalization and variance stabilizing transformations (VST).
2. Fit negative binomial generalized linear models (GLM) across experimental vs control conditions.
3. Apply Benjamini-Hochberg FDR p-adjusted correction (threshold < 0.05, |log2FC| > 1.5).
4. Generate Volcano Plots and GO Biological Process enrichment analyses.`,
        exampleQueries: [
          'Generate a complete DESeq2 workflow script in Python/R for 3 control vs 3 treated RNA-Seq count matrices.',
          'Identify top 10 significantly upregulated genes from the differential expression summary.'
        ],
        workflowSteps: ['Load count matrix', 'DESeq2 negative binomial GLM fitting', 'FDR p-value adjustment', 'Gene Ontology (GO) pathway enrichment']
      },
      {
        id: 'bio-protein-folding',
        name: 'Protein Structure Prediction & AlphaFold Interactor',
        domain: 'bioinformatics',
        domainLabel: 'Bioinformatics & Genomics',
        domainColor: '#10B981',
        icon: 'Boxes',
        description: 'Analyzes amino acid sequences, queries AlphaFold2/ESMFold predicted structures, extracts pLDDT confidence, and finds binding pockets.',
        databaseAccess: ['UniProtKB', 'RCSB Protein Data Bank (PDB)', 'AlphaFold DB'],
        requiredTools: ['http_request', 'python_repl', 'file_write'],
        systemPrompt: `You are a Structural Bioinformatician and AlphaFold/ESMFold Specialist.
1. Parse UniProt accessions or raw amino acid FASTA strings.
2. Query AlphaFold DB REST API for predicted 3D CIF/PDB coordinate files.
3. Assess per-residue confidence (pLDDT > 90 very high, 70-90 confident, < 50 disordered).
4. Predict functional catalytic sites, disulfide bridges, and hydrophobic binding pockets.`,
        exampleQueries: [
          'Fetch AlphaFold structure for human KRAS (P01116) and analyze active binding site residues in Switch I/II regions.',
          'Generate PyMOL script to visualize catalytic triad in Serine Protease with pLDDT color mapping.'
        ]
      },

      // 2. CHEMINFORMATICS & DRUG DISCOVERY
      {
        id: 'chem-smiles-rdkit',
        name: 'SMILES Molecule Canonicalization & RDKit Descriptors',
        domain: 'cheminformatics',
        domainLabel: 'Cheminformatics & Drug Discovery',
        domainColor: '#06B6D4',
        icon: 'FlaskConical',
        description: 'Processes SMILES/InChI strings, computes Lipinski Rule of 5 properties (MW, LogP, HBD, HBA, TPSA), and generates Morgan fingerprints.',
        databaseAccess: ['PubChem', 'ChEMBL', 'ZINC20'],
        requiredTools: ['python_repl', 'calculator', 'file_write'],
        systemPrompt: `You are a Medicinal Chemist and RDKit Cheminformatics Engineer.
When analyzing small molecule structures:
1. Canonicalize SMILES and verify valid valencies and aromaticity.
2. Compute physicochemical descriptors: Molecular Weight (< 500 Da), LogP (Wildman-Crippen < 5), H-Bond Donors (<= 5), H-Bond Acceptors (<= 10), TPSA (< 140 Å²), and Rotatable Bonds.
3. Generate 2048-bit Morgan Fingerprints (Radius 2) for Tanimoto similarity searches.
4. Flag pan-assay interference compounds (PAINS) and toxicophores (Brenk/NIH filters).`,
        exampleQueries: [
          'Evaluate Lipinski Rule of 5 drug-likeness for Imatinib: CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5.',
          'Write Python script using RDKit to calculate Tanimoto similarity between Aspirin and Ibuprofen.'
        ]
      },
      {
        id: 'chem-admet-qsar',
        name: 'ADMET Pharmacokinetics & QSAR Predictor',
        domain: 'cheminformatics',
        domainLabel: 'Cheminformatics & Drug Discovery',
        domainColor: '#06B6D4',
        icon: 'ShieldAlert',
        description: 'Predicts Absorption (Caco-2, HIA), Distribution (BBB, PPB), Metabolism (CYP450 inhibition), Excretion (CL, t1/2), and Toxicity (hERG, Ames, DILI).',
        databaseAccess: ['ChEMBL ADMET', 'DrugBank', 'Tox21'],
        requiredTools: ['python_repl', 'calculator', 'http_request'],
        systemPrompt: `You are a Lead Optimization Pharmacokineticist.
Evaluate ADMET profiles for novel chemical entities:
1. Predict Blood-Brain Barrier (BBB) permeation and intestinal absorption.
2. Screen CYP3A4, CYP2D6, and CYP2C9 metabolic substrate/inhibition liabilities.
3. Calculate hERG potassium channel cardiotoxicity risk and Ames mutagenicity alerts.
4. Recommend bioisosteric modifications to improve metabolic stability and clearance.`,
        exampleQueries: [
          'Assess hERG cardiotoxicity and CYP3A4 liability for small molecule kinase inhibitor leads.',
          'Suggest bioisosteric replacements for a labile ester moiety to enhance oral bioavailability.'
        ]
      },
      {
        id: 'chem-docking-setup',
        name: 'AutoDock Vina Molecular Docking Setup',
        domain: 'cheminformatics',
        domainLabel: 'Cheminformatics & Drug Discovery',
        domainColor: '#06B6D4',
        icon: 'Crosshair',
        description: 'Prepares receptor PDBQT files (adding Gasteiger charges, polar hydrogens), sets grid box dimensions, and runs AutoDock Vina scoring.',
        databaseAccess: ['RCSB PDB', 'BindingDB'],
        requiredTools: ['shell', 'python_repl', 'file_write'],
        systemPrompt: `You are a Computational Chemistry and Molecular Docking Specialist.
Automate AutoDock Vina workflows:
1. Receptor preparation: Strip water molecules, add polar hydrogens, assign Kollman/Gasteiger charges, output PDBQT.
2. Ligand preparation: Define rotatable bonds and torsion tree, convert to PDBQT.
3. Compute bounding grid box coordinates (center_x, center_y, center_z, size_x, size_y, size_z) encompassing target pocket.
4. Parse binding free energy (kcal/mol) and root-mean-square deviation (RMSD) clustering.`,
        exampleQueries: [
          'Generate AutoDock Vina configuration file targeting EGFR kinase domain ATP pocket (PDB 1M17).',
          'Calculate grid box center and dimensions from catalytic residue coordinates.'
        ]
      },

      // 3. COMPUTATIONAL PHYSICS & MATHEMATICS
      {
        id: 'math-pde-solver',
        name: 'PDE & ODE Numerical Solvers (Finite Difference / FEM)',
        domain: 'physics_math',
        domainLabel: 'Computational Physics & Math',
        domainColor: '#8B5CF6',
        icon: 'Binary',
        description: 'Solves partial differential equations (Navier-Stokes, Schrödinger, Heat/Wave equations) using Crank-Nicolson, Runge-Kutta 4, and FEM schemes.',
        databaseAccess: ['ArXiv Math/Physics', 'NIST DLMF'],
        requiredTools: ['python_repl', 'calculator', 'file_write'],
        systemPrompt: `You are a Computational Applied Mathematician and Numerical Analysis Expert.
1. Formulate boundary value problems (Dirichlet, Neumann, Robin conditions).
2. Discretize spatial grids and time steps satisfying Courant-Friedrichs-Lewy (CFL) stability conditions.
3. Implement implicit and explicit integration schemes (RK4, Crank-Nicolson, Runge-Kutta-Fehlberg).
4. Verify conservation laws (energy, mass, momentum) and calculate convergence rates.`,
        exampleQueries: [
          'Write a Python solver for 2D Heat Diffusion Equation with Dirichlet boundary conditions using Crank-Nicolson.',
          'Solve the 1D Time-Dependent Schrödinger Equation for a quantum harmonic oscillator with RK4.'
        ]
      },
      {
        id: 'physics-quantum-dft',
        name: 'Quantum Chemistry & Density Functional Theory (DFT) Configurator',
        domain: 'physics_math',
        domainLabel: 'Computational Physics & Math',
        domainColor: '#8B5CF6',
        icon: 'Atom',
        description: 'Constructs input decks for PySCF, Quantum ESPRESSO, and VASP with exchange-correlation functionals (B3LYP, PBE) and basis sets.',
        databaseAccess: ['Materials Project', 'AFLOW', 'Computational Chemistry Comparison Benchmark'],
        requiredTools: ['python_repl', 'file_write', 'shell'],
        systemPrompt: `You are a Quantum Chemist and Materials Physics Specialist.
1. Formulate electronic structure calculations with PySCF or Quantum ESPRESSO.
2. Select optimal functionals (PBE, B3LYP, HSE06) and basis sets (def2-TZVP, 6-311+G**).
3. Set convergence criteria for SCF energy tolerance (1e-8 Hartree) and density matrix norms.
4. Calculate band gaps, HOMO-LUMO frontiers, electrostatic potentials, and vibrational frequencies.`,
        exampleQueries: [
          'Generate PySCF script to perform geometry optimization of water molecule with B3LYP/cc-pVDZ.',
          'Setup Quantum ESPRESSO pw.x input file for Silicon crystal band structure calculation.'
        ]
      },

      // 4. STATISTICAL MODELING & CAUSAL INFERENCE
      {
        id: 'stat-bayesian-inference',
        name: 'Bayesian MCMC & Probabilistic Programming (PyMC / Stan)',
        domain: 'statistics_data',
        domainLabel: 'Statistics & Causal Inference',
        domainColor: '#F59E0B',
        icon: 'TrendingUp',
        description: 'Constructs hierarchical Bayesian models, runs No-U-Turn Sampler (NUTS) MCMC, checks Gelman-Rubin R-hat convergence, and calculates WAIC/LOO.',
        databaseAccess: ['Zenodo Research Data', 'Kaggle Datasets'],
        requiredTools: ['python_repl', 'calculator', 'file_write'],
        systemPrompt: `You are a Principal Statistician and Bayesian Modeling Expert.
1. Formulate prior distributions (informative vs weakly regularizing priors) and likelihood functions.
2. Implement sampling with PyMC / Stan using Hamiltonian Monte Carlo (HMC / NUTS).
3. Assess MCMC diagnostics: Effective Sample Size (ESS > 400), R-hat convergence (< 1.05), and divergence diagnostics.
4. Compute Posterior Predictive Checks and Highest Density Intervals (HDI 95%).`,
        exampleQueries: [
          'Build hierarchical linear model in PyMC estimating clinical trial efficacy with random clinic effects.',
          'Diagnose MCMC trace divergences and suggest reparameterization (non-centered parameterization).'
        ]
      },
      {
        id: 'stat-causal-inference',
        name: 'Causal Graph Discovery & Do-Calculus Estimator',
        domain: 'statistics_data',
        domainLabel: 'Statistics & Causal Inference',
        domainColor: '#F59E0B',
        icon: 'Network',
        description: 'Discovers causal Directed Acyclic Graphs (DAGs), verifies backdoor and frontdoor criteria, and computes Average Treatment Effects (ATE) using Doubly Robust estimators.',
        databaseAccess: ['CausalML', 'DoWhy Benchmarks'],
        requiredTools: ['python_repl', 'diagram', 'calculator'],
        systemPrompt: `You are a Causal Inference Scientist and Judea Pearl Do-Calculus Specialist.
1. Construct causal Directed Acyclic Graphs (DAGs) and identify confounding paths.
2. Apply Backdoor Adjustment Criterion to select minimally sufficient adjustment sets.
3. Estimate Average Treatment Effect (ATE) and Conditional ATE (CATE) using Propensity Score Weighting and Doubly Robust estimators.
4. Perform sensitivity analysis against unobserved confounders (Rosenbaum bounds).`,
        exampleQueries: [
          'Verify if backdoor criterion is satisfied in DAG: X -> Y, Z -> X, Z -> Y with confounder Z.',
          'Write Python code with DoWhy to estimate treatment effect of feature intervention on user churn.'
        ]
      },

      // 5. ML EXPERIMENTATION & DEEP LEARNING RESEARCH
      {
        id: 'ml-pytorch-ablation',
        name: 'PyTorch Research Pipeline & Ablation Study Runner',
        domain: 'ml_deeplearning',
        domainLabel: 'ML & Deep Learning Research',
        domainColor: '#EC4899',
        icon: 'Cpu',
        description: 'Implements modular PyTorch neural architectures, mixed-precision training loops (AMP), gradient clipping, and automated ablation matrices.',
        databaseAccess: ['Hugging Face Hub', 'Papers With Code', 'PyTorch Models'],
        requiredTools: ['python_repl', 'file_write', 'shell'],
        systemPrompt: `You are a Principal Deep Learning Research Engineer.
1. Write clean, modular PyTorch code with torch.nn.Module, DataLoader, and PyTorch Lightning/Accelerate standards.
2. Implement Automatic Mixed Precision (torch.cuda.amp.autocast) and gradient accumulation.
3. Design structured ablation studies isolating attention heads, layer norm positions (Pre-LN vs Post-LN), and learning rate schedules.
4. Log loss curves, validation perplexity/accuracy, and compute gradient norm histograms.`,
        exampleQueries: [
          'Implement a Transformer Decoder block in PyTorch with FlashAttention-2 and Rotary Positional Embeddings (RoPE).',
          'Create an automated ablation runner script testing 4 different learning rate schedules (Cosine, WarmupLinear, Plateau, Constant).'
        ]
      },
      {
        id: 'ml-bayesian-hpo',
        name: 'Bayesian Hyperparameter Optimization (Optuna / BoTorch)',
        domain: 'ml_deeplearning',
        domainLabel: 'ML & Deep Learning Research',
        domainColor: '#EC4899',
        icon: 'Sliders',
        description: 'Sets up Gaussian Process and Tree-structured Parzen Estimator (TPE) Bayesian search spaces with Hyperband / ASHA pruning.',
        databaseAccess: ['Optuna Dashboard', 'BoTorch Benchmarks'],
        requiredTools: ['python_repl', 'calculator', 'file_write'],
        systemPrompt: `You are an Automated Machine Learning (AutoML) and Bayesian Optimization Expert.
1. Formulate continuous, integer, and categorical hyperparameter search spaces.
2. Implement Optuna studies with TPESampler or GP-based acquisition functions (Expected Improvement, Upper Confidence Bound).
3. Configure median pruners or ASHA pruners to stop unpromising trials early.
4. Generate parameter importance plots and slice plots identifying key performance drivers.`,
        exampleQueries: [
          'Write an Optuna optimization script for tuning learning rate, weight decay, and dropout in a Vision Transformer.',
          'Configure asynchronous successive halving (ASHA) pruning for 100 trial sweeps.'
        ]
      },

      // 6. SCIENTIFIC LITERATURE & SYSTEMATIC REVIEWS
      {
        id: 'lit-pubmed-arxiv-miner',
        name: 'PubMed & ArXiv Research Miner & Citation Graph',
        domain: 'literature_synthesis',
        domainLabel: 'Scientific Literature & Writing',
        domainColor: '#F97316',
        icon: 'BookOpen',
        description: 'Queries PubMed E-utilities and ArXiv APIs, extracts abstracts, maps co-citation networks, and synthesizes state-of-the-art methodology matrices.',
        databaseAccess: ['PubMed / MEDLINE', 'ArXiv API', 'Semantic Scholar', 'Crossref'],
        requiredTools: ['http_request', 'python_repl', 'file_write'],
        systemPrompt: `You are a Research Scientist and Systematic Literature Review Specialist.
1. Construct advanced Boolean search queries for PubMed/ArXiv (MeSH terms, title/abstract search).
2. Extract metadata: Authors, Publication Date, DOI, Impact Metric, and Methodology.
3. Synthesize comparative matrices comparing datasets, baselines, metrics, and limitations across papers.
4. Map key citation genealogies and breakthrough lineage in the field.`,
        exampleQueries: [
          'Search PubMed for recent clinical trials on GLP-1 receptor agonists and metabolic disease mechanisms.',
          'Synthesize comparison matrix of 5 recent papers on State Space Models (Mamba) vs Transformers.'
        ]
      },
      {
        id: 'lit-latex-paper-generator',
        name: 'LaTeX Academic Paper & Supplementary Material Generator',
        domain: 'literature_synthesis',
        domainLabel: 'Scientific Literature & Writing',
        domainColor: '#F97316',
        icon: 'FileText',
        description: 'Generates publication-ready LaTeX manuscripts conforming to Nature, NeurIPS, IEEE, and ACM formats with BibTeX citations and equation rendering.',
        databaseAccess: ['Overleaf Templates', 'BibTeX Hub'],
        requiredTools: ['file_write', 'python_repl'],
        systemPrompt: `You are a Senior Academic Editor and LaTeX Typesetting Authority.
Generate rigorous publication-ready scientific text:
1. Conclude sections with clear contributions, hypotheses, and theoretical derivations in AMS-LaTeX.
2. Format tables with booktabs (\\toprule, \\midrule, \\bottomrule) without vertical borders.
3. Build complete BibTeX entries with verified DOI and publication metadata.
4. Adhere to journal style guides (NeurIPS, Nature Biotechnology, Physical Review Letters).`,
        exampleQueries: [
          'Generate a LaTeX Methods section explaining Gaussian Process Regression with mathematical formulas.',
          'Format benchmark comparison table with bolded top results and standard errors in booktabs format.'
        ]
      }
    ];

    for (const skill of definitions) {
      this.skills.set(skill.id, skill);
    }

    this.isLoaded = true;
  }

  private ensureServerDirectoryScanned(): void {
    if (typeof window !== 'undefined') return;

    try {
      const nodeFs = eval('require')('fs') as typeof import('fs');
      const nodePath = eval('require')('path') as typeof import('path');
      const baseDir = nodePath.join(process.cwd(), 'scientific-skills');

      if (nodeFs.existsSync(baseDir)) {
        // Look for skill markdown / json definitions
        const scan = (dir: string) => {
          const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = nodePath.join(dir, ent.name);
            if (ent.isDirectory() && ent.name !== '.git') {
              scan(full);
            } else if (ent.name.endsWith('.md') || ent.name.endsWith('.json')) {
              if (ent.name === 'README.md' || ent.name === 'LICENSE') continue;
              try {
                const raw = nodeFs.readFileSync(full, 'utf8');
                const rel = nodePath.relative(baseDir, full);
                const skillId = ent.name.replace(/\.(md|json)$/, '').toLowerCase().replace(/\s+/g, '-');
                if (!this.skills.has(skillId)) {
                  this.skills.set(skillId, {
                    id: skillId,
                    name: skillId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                    domain: 'literature_synthesis',
                    domainLabel: 'Scientific Research',
                    domainColor: '#F97316',
                    icon: 'BookOpen',
                    description: `Scientific capability from ${rel}`,
                    databaseAccess: ['Custom Scientific Corpus'],
                    requiredTools: ['python_repl', 'file_read'],
                    systemPrompt: raw.slice(0, 2000),
                    exampleQueries: [`Execute scientific task using ${skillId}`]
                  });
                }
              } catch {}
            }
          }
        };
        scan(baseDir);
      }
    } catch {}
  }

  public getAllSkills(): ScientificSkillDefinition[] {
    return Array.from(this.skills.values());
  }

  public getSkillById(id: string): ScientificSkillDefinition | null {
    return this.skills.get(id) || null;
  }

  public getSkillsByDomain(domain: ScientificDomain): ScientificSkillDefinition[] {
    return this.getAllSkills().filter(s => s.domain === domain);
  }

  public getCategories(): ScientificDomainCategory[] {
    const counts: Record<string, number> = {};
    for (const s of this.getAllSkills()) {
      counts[s.domain] = (counts[s.domain] || 0) + 1;
    }

    return [
      { id: 'bioinformatics', label: 'Bioinformatics & Genomics', color: '#10B981', icon: 'Dna', count: counts['bioinformatics'] || 0 },
      { id: 'cheminformatics', label: 'Cheminformatics & Drug Discovery', color: '#06B6D4', icon: 'FlaskConical', count: counts['cheminformatics'] || 0 },
      { id: 'physics_math', label: 'Computational Physics & Math', color: '#8B5CF6', icon: 'Binary', count: counts['physics_math'] || 0 },
      { id: 'statistics_data', label: 'Statistics & Causal Inference', color: '#F59E0B', icon: 'TrendingUp', count: counts['statistics_data'] || 0 },
      { id: 'ml_deeplearning', label: 'ML & Deep Learning Research', color: '#EC4899', icon: 'Cpu', count: counts['ml_deeplearning'] || 0 },
      { id: 'literature_synthesis', label: 'Scientific Literature & Writing', color: '#F97316', icon: 'BookOpen', count: counts['literature_synthesis'] || 0 }
    ];
  }

  public searchSkills(query: string, domain?: string): ScientificSkillDefinition[] {
    let list = this.getAllSkills();
    if (domain && domain !== 'all') {
      list = list.filter(s => s.domain === domain);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.domainLabel.toLowerCase().includes(q) ||
        s.databaseAccess.some(db => db.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public buildScientificPrompt(skillId: string, userTask: string, contextSnippet?: string): string {
    const skill = this.getSkillById(skillId);
    if (!skill) {
      return `User Scientific Task: ${userTask}\n\nContext:\n${contextSnippet || 'No file context provided.'}`;
    }

    return `=== SCIENTIFIC AGENT SKILL: ${skill.name.toUpperCase()} ===
DOMAIN: ${skill.domainLabel}
DATABASES: ${skill.databaseAccess.join(', ')}
REQUIRED TOOLS: ${skill.requiredTools.join(', ')}

--- SCIENTIFIC DIRECTIVE & DOMAIN EXPERTISE ---
${skill.systemPrompt}
-----------------------------------------------

SCIENTIFIC RESEARCH OBJECTIVE:
${userTask}

${contextSnippet ? `CODE / EXPERIMENT / DATA CONTEXT:\n${contextSnippet}\n` : ''}
Provide rigorous, peer-review quality analysis, step-by-step methodologies, verified equations, and reproducible code blocks.`;
  }
}

export const scientificSkillsEngine = new ScientificSkillsEngine();
