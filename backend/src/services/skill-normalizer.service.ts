/**
 * Skill Normalizer Service
 * Provides NLP-based skill matching to handle variations like:
 * - Node, NodeJS, Node.js, node js -> all match
 * - React, ReactJS, React.js -> all match
 * - MongoDB, Mongo DB, Mongo, mongo -> all match
 */

// Comprehensive skill aliases map
const SKILL_ALIASES: Record<string, string[]> = {
  // JavaScript Ecosystem
  'javascript': ['javascript', 'js', 'ecmascript', 'es6', 'es7', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'es2023', 'vanilla js', 'vanilla javascript'],
  'typescript': ['typescript', 'ts', 'type script'],
  'nodejs': ['nodejs', 'node.js', 'node', 'node js', 'expressjs', 'express.js', 'express'],
  'express': ['express', 'expressjs', 'express.js', 'express js'],
  'react': ['react', 'reactjs', 'react.js', 'react js', 'react native', 'reactnative'],
  'vue': ['vue', 'vuejs', 'vue.js', 'vue js', 'vue 2', 'vue 3', 'vue2', 'vue3'],
  'angular': ['angular', 'angularjs', 'angular.js', 'angular js', 'angular 2', 'angular2', 'ng'],
  'nextjs': ['nextjs', 'next.js', 'next', 'next js'],
  'nuxt': ['nuxt', 'nuxtjs', 'nuxt.js', 'nuxt js'],
  'svelte': ['svelte', 'sveltejs', 'svelte.js', 'sveltekit'],
  'jquery': ['jquery', 'j query', 'jq'],
  'deno': ['deno', 'denojs', 'deno.js'],
  'bun': ['bun', 'bunjs', 'bun.js'],
  
  // Databases
  'mongodb': ['mongodb', 'mongo db', 'mongo', 'mongoose', 'mongodb atlas', 'atlas'],
  'mysql': ['mysql', 'my sql', 'mariadb', 'maria db'],
  'postgresql': ['postgresql', 'postgres', 'psql', 'pg', 'postgre sql', 'postgres sql'],
  'redis': ['redis', 'redis db', 'redisdb'],
  'sqlite': ['sqlite', 'sqlite3', 'sq lite'],
  'oracle': ['oracle', 'oracle db', 'oracledb', 'plsql', 'pl/sql'],
  'mssql': ['mssql', 'sql server', 'sqlserver', 'microsoft sql', 'ms sql'],
  'dynamodb': ['dynamodb', 'dynamo db', 'dynamo', 'aws dynamodb'],
  'cassandra': ['cassandra', 'apache cassandra'],
  'elasticsearch': ['elasticsearch', 'elastic search', 'elastic', 'es', 'opensearch'],
  'firebase': ['firebase', 'firestore', 'firebase db', 'firebase firestore'],
  'supabase': ['supabase', 'supa base'],
  
  // Cloud & DevOps
  'aws': ['aws', 'amazon web services', 'amazon aws', 'ec2', 's3', 'lambda', 'cloudformation'],
  'azure': ['azure', 'microsoft azure', 'ms azure', 'azure devops'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform', 'gcloud'],
  'docker': ['docker', 'dockerfile', 'docker compose', 'docker-compose', 'containerization'],
  'kubernetes': ['kubernetes', 'k8s', 'kube', 'kubectl', 'k8', 'openshift'],
  'terraform': ['terraform', 'tf', 'hashicorp terraform'],
  'ansible': ['ansible', 'ansible playbook'],
  'jenkins': ['jenkins', 'jenkins ci', 'jenkinsfile'],
  'circleci': ['circleci', 'circle ci', 'circle'],
  'github-actions': ['github actions', 'github-actions', 'gh actions', 'gha'],
  'gitlab-ci': ['gitlab ci', 'gitlab-ci', 'gitlab ci/cd'],
  'nginx': ['nginx', 'nginix', 'ng inx'],
  'apache': ['apache', 'apache2', 'httpd', 'apache http'],
  
  // Programming Languages
  'python': ['python', 'py', 'python3', 'python 3', 'python2', 'python 2'],
  'java': ['java', 'java se', 'java ee', 'j2ee', 'jdk', 'jre', 'openjdk'],
  'csharp': ['c#', 'csharp', 'c sharp', '.net', 'dotnet', 'asp.net', 'aspnet'],
  'cpp': ['c++', 'cpp', 'cplusplus', 'c plus plus'],
  'c': ['c', 'c language', 'clang'],
  'go': ['go', 'golang', 'go lang'],
  'rust': ['rust', 'rustlang', 'rust lang'],
  'ruby': ['ruby', 'rb', 'ruby on rails', 'rails', 'ror'],
  'php': ['php', 'php7', 'php8', 'php 7', 'php 8', 'laravel', 'symfony'],
  'swift': ['swift', 'swiftui', 'swift ui'],
  'kotlin': ['kotlin', 'kt', 'kotlin lang'],
  'scala': ['scala', 'scala lang'],
  'r': ['r', 'r language', 'rlang', 'r programming'],
  'matlab': ['matlab', 'mat lab', 'octave'],
  'perl': ['perl', 'perl5', 'perl 5'],
  
  // Frontend & CSS
  'html': ['html', 'html5', 'html 5', 'hypertext markup language'],
  'css': ['css', 'css3', 'css 3', 'cascading style sheets'],
  'sass': ['sass', 'scss', 'sass/scss'],
  'less': ['less', 'less css', 'lesscss'],
  'tailwindcss': ['tailwind', 'tailwindcss', 'tailwind css', 'tw'],
  'bootstrap': ['bootstrap', 'bootstrap 5', 'bootstrap5', 'bs'],
  'materialui': ['material ui', 'materialui', 'mui', 'material-ui', 'material design'],
  'chakraui': ['chakra ui', 'chakraui', 'chakra-ui', 'chakra'],
  'antdesign': ['ant design', 'antd', 'antdesign', 'ant-design'],
  'styledcomponents': ['styled components', 'styled-components', 'styledcomponents'],
  
  // Mobile Development
  'reactnative': ['react native', 'reactnative', 'react-native', 'rn'],
  'flutter': ['flutter', 'dart', 'flutter dart'],
  'ios': ['ios', 'ios development', 'iphone', 'ipad', 'ipados'],
  'android': ['android', 'android development', 'android studio'],
  'xamarin': ['xamarin', 'xamarin forms', 'xamarin.forms'],
  'ionic': ['ionic', 'ionic framework', 'ionicframework'],
  
  // AI/ML
  'tensorflow': ['tensorflow', 'tensor flow', 'tf', 'keras'],
  'pytorch': ['pytorch', 'py torch', 'torch'],
  'machinelearning': ['machine learning', 'ml', 'machinelearning', 'machine-learning'],
  'deeplearning': ['deep learning', 'dl', 'deeplearning', 'deep-learning'],
  'ai': ['ai', 'artificial intelligence', 'artificial-intelligence'],
  'nlp': ['nlp', 'natural language processing', 'natural-language-processing'],
  'opencv': ['opencv', 'open cv', 'cv2'],
  'scikit': ['scikit-learn', 'sklearn', 'scikit', 'scikitlearn'],
  'pandas': ['pandas', 'pd'],
  'numpy': ['numpy', 'np', 'num py'],
  
  // Testing
  'jest': ['jest', 'jestjs', 'jest.js'],
  'mocha': ['mocha', 'mochajs', 'mocha.js'],
  'cypress': ['cypress', 'cypress.io', 'cypressio'],
  'selenium': ['selenium', 'selenium webdriver', 'webdriver'],
  'playwright': ['playwright', 'play wright'],
  'junit': ['junit', 'j unit', 'junit5', 'junit 5'],
  'pytest': ['pytest', 'py test', 'py.test'],
  'jasmine': ['jasmine', 'jasminejs'],
  'karma': ['karma', 'karma runner'],
  
  // Tools & Version Control
  'git': ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
  'svn': ['svn', 'subversion', 'apache subversion'],
  'npm': ['npm', 'npmjs', 'node package manager'],
  'yarn': ['yarn', 'yarnpkg'],
  'pnpm': ['pnpm'],
  'webpack': ['webpack', 'web pack'],
  'vite': ['vite', 'vitejs', 'vite.js'],
  'babel': ['babel', 'babeljs', 'babel.js'],
  'eslint': ['eslint', 'es lint'],
  'prettier': ['prettier', 'prettierrc'],
  
  // API & Architecture
  'rest': ['rest', 'restful', 'rest api', 'restapi', 'rest-api'],
  'graphql': ['graphql', 'graph ql', 'gql', 'apollo'],
  'grpc': ['grpc', 'g rpc', 'grpc-web'],
  'websocket': ['websocket', 'websockets', 'ws', 'socket.io', 'socketio'],
  'microservices': ['microservices', 'micro services', 'microservice', 'micro-services'],
  'serverless': ['serverless', 'server less', 'faas', 'lambda'],
  'oauth': ['oauth', 'oauth2', 'oauth 2', 'oauth2.0'],
  'jwt': ['jwt', 'json web token', 'json-web-token'],
  
  // Data & Analytics
  'sql': ['sql', 'structured query language'],
  'nosql': ['nosql', 'no sql', 'non-relational'],
  'bigdata': ['big data', 'bigdata', 'big-data'],
  'hadoop': ['hadoop', 'apache hadoop', 'hdfs'],
  'spark': ['spark', 'apache spark', 'pyspark'],
  'kafka': ['kafka', 'apache kafka'],
  'tableau': ['tableau', 'tableau desktop'],
  'powerbi': ['power bi', 'powerbi', 'power-bi', 'pbi'],
  
  // Other
  'agile': ['agile', 'scrum', 'kanban', 'agile methodology'],
  'linux': ['linux', 'ubuntu', 'centos', 'debian', 'redhat', 'rhel', 'fedora'],
  'unix': ['unix', 'unix/linux', 'bash', 'shell', 'shell scripting'],
  'windows': ['windows', 'windows server', 'powershell'],
  'macos': ['macos', 'mac os', 'osx', 'os x'],
};

// Build reverse mapping for quick lookup
const SKILL_TO_CANONICAL: Map<string, string> = new Map();

// Initialize the reverse mapping
Object.entries(SKILL_ALIASES).forEach(([canonical, aliases]) => {
  aliases.forEach(alias => {
    SKILL_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  });
});

class SkillNormalizerService {
  /**
   * Normalize a single skill to its canonical form
   */
  normalizeSkill(skill: string): string {
    const cleaned = skill.toLowerCase().trim()
      .replace(/[^a-z0-9\s\.\+\#]/g, '') // Remove special chars except ., +, #
      .replace(/\s+/g, ' '); // Normalize spaces
    
    // Check direct mapping first
    if (SKILL_TO_CANONICAL.has(cleaned)) {
      return SKILL_TO_CANONICAL.get(cleaned)!;
    }

    // Try without dots and spaces
    const noDots = cleaned.replace(/[\.\s]/g, '');
    if (SKILL_TO_CANONICAL.has(noDots)) {
      return SKILL_TO_CANONICAL.get(noDots)!;
    }

    // Try with 'js' suffix removed
    if (cleaned.endsWith('js')) {
      const withoutJs = cleaned.slice(0, -2).trim();
      if (SKILL_TO_CANONICAL.has(withoutJs)) {
        return SKILL_TO_CANONICAL.get(withoutJs)!;
      }
    }

    // Try with '.js' suffix removed
    if (cleaned.endsWith('.js')) {
      const withoutDotJs = cleaned.slice(0, -3).trim();
      if (SKILL_TO_CANONICAL.has(withoutDotJs)) {
        return SKILL_TO_CANONICAL.get(withoutDotJs)!;
      }
    }

    // Return cleaned version if no mapping found
    return cleaned;
  }

  /**
   * Normalize an array of skills
   */
  normalizeSkills(skills: string[]): string[] {
    const normalized = skills.map(skill => this.normalizeSkill(skill));
    // Remove duplicates while preserving order
    return [...new Set(normalized)];
  }

  /**
   * Check if two skills match (after normalization)
   */
  skillsMatch(skill1: string, skill2: string): boolean {
    const norm1 = this.normalizeSkill(skill1);
    const norm2 = this.normalizeSkill(skill2);
    
    // Exact match after normalization
    if (norm1 === norm2) return true;

    // Partial match (one contains the other)
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    // Check if they share a common canonical form
    const canonical1 = SKILL_TO_CANONICAL.get(norm1);
    const canonical2 = SKILL_TO_CANONICAL.get(norm2);
    
    if (canonical1 && canonical2 && canonical1 === canonical2) return true;

    return false;
  }

  /**
   * Calculate skill match between job requirements and candidate skills
   * Returns detailed match information including matched and missing skills
   */
  calculateSkillMatch(
    jobSkills: string[],
    candidateSkills: string[]
  ): {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    matchDetails: Array<{
      jobSkill: string;
      matched: boolean;
      matchedWith?: string;
      canonical?: string;
    }>;
  } {
    if (!jobSkills.length) {
      return { score: 100, matchedSkills: [], missingSkills: [], matchDetails: [] };
    }

    if (!candidateSkills.length) {
      return { score: 0, matchedSkills: [], missingSkills: jobSkills, matchDetails: [] };
    }

    const normalizedCandidateSkills = this.normalizeSkills(candidateSkills);
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const matchDetails: Array<{
      jobSkill: string;
      matched: boolean;
      matchedWith?: string;
      canonical?: string;
    }> = [];

    jobSkills.forEach(jobSkill => {
      const normalizedJobSkill = this.normalizeSkill(jobSkill);
      
      // Find a matching candidate skill
      const matchingCandidateSkill = candidateSkills.find(candidateSkill => 
        this.skillsMatch(jobSkill, candidateSkill)
      );

      if (matchingCandidateSkill) {
        matchedSkills.push(jobSkill);
        matchDetails.push({
          jobSkill,
          matched: true,
          matchedWith: matchingCandidateSkill,
          canonical: normalizedJobSkill
        });
      } else {
        missingSkills.push(jobSkill);
        matchDetails.push({
          jobSkill,
          matched: false,
          canonical: normalizedJobSkill
        });
      }
    });

    const score = Math.round((matchedSkills.length / jobSkills.length) * 100);

    return {
      score,
      matchedSkills,
      missingSkills,
      matchDetails
    };
  }

  /**
   * Get the canonical form of a skill (if known)
   */
  getCanonicalSkill(skill: string): string | null {
    const normalized = this.normalizeSkill(skill);
    return SKILL_TO_CANONICAL.get(normalized) || null;
  }

  /**
   * Get all aliases for a skill
   */
  getSkillAliases(skill: string): string[] {
    const canonical = this.getCanonicalSkill(skill) || this.normalizeSkill(skill);
    return SKILL_ALIASES[canonical] || [skill];
  }

  /**
   * Suggest similar skills based on input
   */
  suggestSimilarSkills(skill: string): string[] {
    const normalized = this.normalizeSkill(skill);
    const suggestions: string[] = [];

    // Look for partial matches in canonical skill names
    Object.keys(SKILL_ALIASES).forEach(canonical => {
      if (canonical.includes(normalized) || normalized.includes(canonical)) {
        suggestions.push(canonical);
      }
    });

    return [...new Set(suggestions)].slice(0, 5);
  }
}

export const skillNormalizerService = new SkillNormalizerService();
export default skillNormalizerService;
