import type { AppMode } from '../types';

export type SopRoleTag =
    | 'all'
    | 'worker'
    | 'agronomist'
    | 'manager'
    | 'accountant'
    | 'founder'
    | 'buyer'
    | 'root';

export type SopCategory =
    | 'Core Operations'
    | 'Identity & Enterprise'
    | 'Field & Agronomy'
    | 'Harvest & Warehouse'
    | 'HR & Finance'
    | 'Market & Communications'
    | 'Offline & Local Server'
    | 'System Administration';

export interface RootManualSopItem {
    id: string;
    code: string;
    moduleMode: AppMode;
    category: SopCategory;
    roles: SopRoleTag[];
    rootOnly?: boolean;
    sourceDoc: string;
    titleEn: string;
    titleKa: string;
    purposeEn: string;
    purposeKa: string;
    optionsEn: string[];
    optionsKa: string[];
    stepsEn: string[];
    stepsKa: string[];
    aiPromptEn: string;
    aiPromptKa: string;
}

export const ROOT_MANUAL_SOPS: RootManualSopItem[] = [
    {
        id: 'sop-sys-00',
        code: 'SOP-SYS-00',
        moduleMode: 'dashboard',
        category: 'Core Operations',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder'],
        sourceDoc: 'item_list.txt',
        titleEn: 'Top Navigation Bar & Workspace Controls',
        titleKa: 'ზედა მენიუს ზოლი და სამუშაო სივრცის მართვა',
        purposeEn: 'Navigate workspaces, monitor local cache/sync health, search globally, switch language/currency, and save operational changes.',
        purposeKa: 'სამუშაო სივრცეების გადართვა, ლოკალური ქეშისა და სინქრონიზაციის კონტროლი, გლობალური ძებნა, ენის/ვალუტის შეცვლა და მონაცემების შენახვა.',
        optionsEn: [
            'Workspace Switcher (Personal Workspace vs Company Organizations)',
            'Local Cache Storage Indicator (IndexedDB / LocalStorage meter)',
            'Global Search Bar (⌘K / Ctrl+K across fields, workers, lots, and tasks)',
            'Cloud / Local Node Sync Status & Offline Queue Monitor',
            'Region Selector, Language Switch (EN / KA), Currency (USD / GEL / EUR)',
            'Manual Save Button, Help & SOPs, Notifications Bell, and User Profile Menu'
        ],
        optionsKa: [
            'სამუშაო სივრცის გადამრთველი (პირადი სივრცე vs კომპანიის ორგანიზაციები)',
            'ლოკალური ქეშის ინდიკატორი (ოფლაინ მეხსიერების მონიტორი)',
            'გლობალური ძებნა (⌘K — ნაკვეთები, თანამშრომლები, მოსავალი, დავალებები)',
            'ღრუბლოვანი / ლოკალური სერვერის სინქრონიზაციის სტატუსი',
            'რეგიონის, ენის (EN / KA) და ვალუტის (USD / GEL / EUR) გადამრთველები',
            'მექანიკური შენახვა (Save), დახმარება/SOP, შეტყობინებები და პროფილის მენიუ'
        ],
        stepsEn: [
            'Confirm the active Workspace pill at top-left matches your assigned farm or personal account before entering data.',
            'Use Global Search (⌘K) to jump directly to any sector, worker, crop, or invoice without navigating sub-menus.',
            'Check the Cloud / Local Node indicator when working in low-signal orchards — offline entries buffer safely until reconnect.',
            'Click Save after major bulk edits or wait for the automatic sync indicator to turn emerald green.'
        ],
        stepsKa: [
            'მონაცემების შეყვანამდე ზედა მარცხენა გადამრთველში გადაამოწმეთ, რომ არჩეულია სწორი ფერმა ან პირადი სამუშაო სივრცე.',
            'გამოიყენეთ გლობალური ძებნა (⌘K) ნებისმიერი სექტორის, მუშაკის, კულტურის ან ჩანაწერის სწრაფად მოსაძებნად.',
            'საველე პირობებში შეამოწმეთ Cloud / Local Node ინდიკატორი — ოფლაინ ჩანაწერები ავტომატურად ინახება სინქრონიზაციამდე.',
            'დიდი ცვლილებების შემდეგ დააჭირეთ Save ღილაკს ან დაელოდეთ სინქრონიზაციის მწვანე სტატუსს.'
        ],
        aiPromptEn: 'Explain how to use the Top Navigation Bar controls, Workspace Switcher, Offline Sync, and Global Search in AgriMap Pro.',
        aiPromptKa: 'ამიხსენი ზედა მენიუს ზოლის, სამუშაო სივრცის გადამრთველის, ოფლაინ სინქრონიზაციის და გლობალური ძებნის გამოყენება.'
    },
    {
        id: 'sop-mod-01',
        code: 'SOP-MOD-01',
        moduleMode: 'dashboard',
        category: 'Core Operations',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Dashboard Overview & Customizable Widget Layout',
        titleKa: 'მთავარი დაფა (Dashboard) და ვიჯეტების განლაგების მართვა',
        purposeEn: 'Monitor real-time plantation KPIs, interactive map positions, weather, tasks, attendance, and customize visible widgets per user role.',
        purposeKa: 'პლანტაციის ძირითადი მაჩვენებლების, რუკის, ამინდის, დავალებებისა და დასწრების კონტროლი და ვიჯეტების მორგება.',
        optionsEn: [
            'Layout Manager Modal (show/hide, reorder, and resize 1x/2x/3x any widget except Map)',
            'Map Position Switcher (Top, With Profile, Upper, Bottom, Floating Window)',
            'Profile Verification & Onboarding Cards (blink when pending; auto-hide after verification/role choice)',
            'System Command & Operations Center (12-module quick launch grid with Expand/Collapse)',
            'KPI & Operational Widgets: Field Summary, Seedling Census, Harvest Pulse, Attendance, Weather, Tasks, Planner, Hardware Labs, Team Hubs, Market Feed, Crops'
        ],
        optionsKa: [
            'განლაგების მენეჯერი (Layout — ნებისმიერი ვიჯეტის დამალვა/ჩვენება, გადაადგილება და ზომის შეცვლა რუკის გარდა)',
            'რუკის პოზიციის არჩევა (სულ ზემოთ, პროფილთან, ზემოთ, ქვემოთ, მოძრავი ფანჯარა)',
            'პროფილის ვერიფიკაციის და როლის ბარათები (ციმციმებს შევსებამდე და ავტომატურად იმალება დასრულების შემდეგ)',
            'სისტემის მართვის პანელი (12 მოდულის სწრაფი გადასასვლელი გაშლა/ჩაკეცვის ფუნქციით)',
            'ოპერაციული ვიჯეტები: ნაკვეთები, ნერგები, მოსავალი, დასწრება, ამინდი, დავალებები, დამგეგმავი, სენსორები, გუნდი, მარკეტი'
        ],
        stepsEn: [
            'If your Profile Verification or Role card is blinking, click Verify Now / Manage Profile to finish onboarding — both cards clear automatically once complete.',
            'Click the Layout button on the dashboard banner to hide widgets you do not use or bring back hidden ones at any time.',
            'Hover any widget card top-right menu (⋮) to move it up/down, change width (1x/2x/3x), pop out in a floating window, or Hide from Dashboard.',
            'Use the Map Position selector in Layout to keep the live satellite map at Top, Upper, Bottom, or Floating.'
        ],
        stepsKa: [
            'თუ პროფილის ვერიფიკაციის ან როლის ბარათი ციმციმებს, დააჭირეთ ღილაკს და დაასრულეთ დადასტურება — შემდეგ ისინი ავტომატურად გაქრება დაფიდან.',
            'დააჭირეთ ბანერზე Layout ღილაკს, რათა დამალოთ ზედმეტი ვიჯეტები ან გამოაჩინოთ საჭიროების შემთხვევაში.',
            'ნებისმიერი ვიჯეტის ზედა მარჯვენა მენიუდან (⋮) შეგიძლიათ შეცვალოთ რიგითობა, სიგანე (1x/2x/3x), გახსნათ ფანჯარაში ან დამალოთ.',
            'Layout-ში შეგიძლიათ აირჩიოთ ინტერაქტიული რუკის სასურველი პოზიცია.'
        ],
        aiPromptEn: 'How do I customize Dashboard widgets, hide/show panels in Layout, and clear the blinking verification widget?',
        aiPromptKa: 'როგორ მოვარგო Dashboard-ის ვიჯეტები Layout-ით და როგორ გავაქრო პროფილის ვერიფიკაციის მოციმციმე ბარათი?'
    },
    {
        id: 'sop-mod-02',
        code: 'SOP-MOD-02',
        moduleMode: 'profile',
        category: 'Identity & Enterprise',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder', 'buyer'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Profile, G-I-C-W Identity Architecture & KYC Verification',
        titleKa: 'პროფილი, G-I-C-W იდენტობა და KYC ვერიფიკაცია',
        purposeEn: 'Establish verified user identity (Global ID G-xxx, Individual ID I-xxx), select operational role, and complete KYC compliance.',
        purposeKa: 'მომხმარებლის ვერიფიცირებული იდენტობის (G-xxx / I-xxx) შექმნა, სამუშაო როლის არჩევა და პირადობის KYC დადასტურება.',
        optionsEn: [
            'Personal Identity Form (Full Name, Phone, Email, Country/Region, Interface Language)',
            'Unique Identity Registry: G-xxx (Global), I-xxx (Individual), C-xxx (Company), W-xxx (Worker)',
            'Primary Role / Goal Selector (Company Manager, Worker/Staff, Agronomist, Service Provider, Buyer)',
            'KYC Document Verification Upload (National ID / Passport & Verification Status Badge)',
            'Security Settings, Password/Session Controls & Role Request Portal'
        ],
        optionsKa: [
            'პირადი მონაცემები (სახელი/გვარი, ტელეფონი, ელ-ფოსტა, ქვეყანა/რეგიონი, ენა)',
            'უნიკალური ID სისტემა: G-xxx (გლობალური), I-xxx (ინდივიდუალური), C-xxx (კომპანია), W-xxx (მუშაკი)',
            'სამუშაო როლის / მიზნის არჩევა (კომპანიის მართვა, მუშაკი, აგრონომი, სერვისის მიმწოდებელი, მყიდველი)',
            'KYC პირადობის ვერიფიკაციის ატვირთვა და დადასტურების სტატუსი',
            'უსაფრთხოების პარამეტრები და როლის მოთხოვნის პორტალი'
        ],
        stepsEn: [
            'Open Profile from the top-right user menu or the blinking Dashboard Verification card.',
            'Fill in Full Name, active Phone Number, Country/Region, and verify Email.',
            'Select your operational Role (e.g., Worker, Agronomist, Manager, Founder, or Buyer) and save.',
            'Upload ID/Passport images under KYC Verification so your account moves from Pending to Verified.',
            'Once verified and role is selected, return to Dashboard — onboarding prompts automatically clear.'
        ],
        stepsKa: [
            'გახსენით პროფილი ზედა მარჯვენა მენიუდან ან Dashboard-ის მოციმციმე ბარათიდან.',
            'შეავსეთ სახელი, გვარი, მოქმედი ტელეფონი, რეგიონი და გადაამოწმეთ ელ-ფოსტა.',
            'აირჩიეთ თქვენი ძირითადი სამუშაო როლი (მუშაკი, აგრონომი, მენეჯერი, დამფუძნებელი ან მყიდველი) და შეინახეთ.',
            'ატვირთეთ პირადობის მოწმობის ფოტო KYC ვერიფიკაციის განყოფილებაში სტატუსის დასადასტურებლად.',
            'დასრულების შემდეგ დაბრუნდით მთავარ დაფაზე — ვერიფიკაციის ბარათები ავტომატურად მოიხსნება.'
        ],
        aiPromptEn: 'Walk me through completing Profile KYC Verification, choosing my role, and understanding G-I-C-W IDs.',
        aiPromptKa: 'მასწავლე პროფილის KYC ვერიფიკაციის გავლა, როლის არჩევა და G-I-C-W იდენტიფიკატორების მნიშვნელობა.'
    },
    {
        id: 'sop-mod-03',
        code: 'SOP-MOD-03',
        moduleMode: 'founders',
        category: 'Identity & Enterprise',
        roles: ['founder', 'manager'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Founders Hub & Company Registration',
        titleKa: 'დამფუძნებელთა ჰაბი (Founders Hub) და კომპანიის რეგისტრაცია',
        purposeEn: 'Register agricultural enterprises (C-xxx), configure legal tax IDs, manage co-founder equity (100% cap table), and govern corporate permissions.',
        purposeKa: 'აგრო-კომპანიის (C-xxx) რეგისტრაცია, საიდენტიფიკაციო კოდის, დამფუძნებელთა წილების (100%) და კორპორატიული უფლებების მართვა.',
        optionsEn: [
            'Company Legal Profile (Name, Tax ID / Identification Code, Legal Form: LLC, Cooperative, JSC, IE)',
            'Co-Founder Equity & Cap Table Manager (shares summing to 100% + signing authority)',
            'Organization Switcher & Multi-Company Creation',
            'Company Verification Badge & Official Document Vault',
            'Role & Team Governance Delegation'
        ],
        optionsKa: [
            'კომპანიის იურიდიული პროფილი (დასახელება, საიდენტიფიკაციო კოდი, სამართლებრივი ფორმა)',
            'თანადამფუძნებლების წილების ცხრილი (ჯამში 100%) და ხელმოწერის უფლებები',
            'მრავალი ორგანიზაციის შექმნა და გადართვა',
            'კომპანიის ვერიფიკაციის სტატუსი და დოკუმენტების საცავი',
            'გუნდის როლებისა და წვდომის უფლებების დელეგირება'
        ],
        stepsEn: [
            'Open Founders Hub after completing your personal profile.',
            'Click Register Company and enter Legal Name, Tax ID, Country, and Primary Crops.',
            'Add co-founders with their exact equity percentages (total must equal 100%).',
            'Switch your top-bar Workspace Selector to the newly created company to unlock Enterprise modules (GIS Map, HR, Warehouse, Harvesting, Accounting).'
        ],
        stepsKa: [
            'პირადი პროფილის შევსების შემდეგ გახსენით Founders Hub.',
            'დააჭირეთ კომპანიის რეგისტრაციას და შეიყვანეთ დასახელება, საიდენტიფიკაციო კოდი და კულტურები.',
            'დაამატეთ თანადამფუძნებლები და მათი წილები (ჯამი უნდა იყოს 100%).',
            'ზედა მენიუში გადართეთ სამუშაო სივრცე თქვენს ახალ კომპანიაზე, რათა გააქტიურდეს საწარმოს ყველა მოდული.'
        ],
        aiPromptEn: 'How do I register my agricultural company in Founders Hub and assign co-founder equity?',
        aiPromptKa: 'როგორ დავარეგისტრირო აგრო-კომპანია Founders Hub-ში და გავანაწილო დამფუძნებლების წილები?'
    },
    {
        id: 'sop-mod-04',
        code: 'SOP-MOD-04',
        moduleMode: 'design',
        category: 'Field & Agronomy',
        roles: ['all', 'agronomist', 'manager', 'founder', 'worker'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Plantation Map, GIS Designer & Sector Cadastre',
        titleKa: 'პლანტაციის რუკა, GIS დიზაინერი და სექტორების კადასტრი',
        purposeEn: 'Locate land parcels on satellite maps, draw GPS boundaries and planting sectors, place seedling rows/trees, irrigation lines, and map field checkpoints.',
        purposeKa: 'ნაკვეთის მოძიება სატელიტზე, საზღვრების და სექტორების მოხაზვა, ნერგების რიგების, სარწყავი სისტემის და საველე წერტილების დატანა.',
        optionsEn: [
            'Satellite / Hybrid / Terrain Layer Switcher & GPS Locate-Me',
            'Parcel Search by GPS Coordinates, Cadastral Code, or Village Name',
            'Drawing Tools: Boundary Polygon, Planting Sector (Area), Seedling Row / Individual Trees, Irrigation Pipes, Checkpoints & Field Notes',
            'Right-Click Context Menu: Add Work, Add Task, Add Note, Drone Mission Simulation, AI Field Analysis',
            'Automatic Hectare (ha) / Square Meter (m²) Area Calculation & Variety Assignment'
        ],
        optionsKa: [
            'სატელიტური / ტოპოგრაფიული ფენების გადამრთველი და GPS ლოკაცია',
            'ნაკვეთის ძიება კოორდინატებით, საკადასტრო კოდით ან სოფლის სახელით',
            'ხაზვის ხელსაწყოები: საზღვრის პოლიგონი, სექტორი, ნერგების რიგები, სარწყავი მილები, საკონტროლო წერტილები',
            'მარჯვენა კლიკის მენიუ: სამუშაოს/დავალების/შენიშვნის დამატება, დრონის სიმულაცია, AI ანალიზი',
            'ჰექტარების (ha) ავტომატური გამოთვლა და ჯიშების მიბმა სექტორებზე'
        ],
        stepsEn: [
            'Open Plantation Map & Design and switch base map to Satellite view.',
            'Search your parcel by village name, cadastral code, or GPS coordinates.',
            'Select Draw Boundary / Area Polygon, click each parcel corner, and double-click to close — hectares calculate automatically.',
            'Assign crop and variety (e.g., Blueberries — Legacy/Duke, Hazelnuts — Anakliuri) to each sector.',
            'Right-click anywhere on the map to pin field tasks, work orders, or agronomy notes directly to GPS coordinates.'
        ],
        stepsKa: [
            'გახსენით რუკა (Map & Design) და ჩართეთ სატელიტური ხედი (Satellite).',
            'მოძებნეთ ნაკვეთი სოფლის სახელით, საკადასტრო კოდით ან GPS კოორდინატებით.',
            'აირჩიეთ საზღვრის/სექტორის მოხაზვა, მონიშნეთ ნაკვეთის კუთხეები და დახურეთ პოლიგონი — ფართობი ჰექტარებში ავტომატურად დაითვლება.',
            'თითოეულ სექტორს მიაბით კულტურა და ჯიში (მაგ: მოცვი, თხილი, ჩაი).',
            'რუკაზე მარჯვენა კლიკით ნებისმიერ წერტილზე შეგიძლიათ მიამაგროთ საველე დავალება ან შენიშვნა.'
        ],
        aiPromptEn: 'How do I locate my plantation on satellite view, draw sector boundaries, and pin tasks on the map?',
        aiPromptKa: 'როგორ მოვძებნო პლანტაცია სატელიტზე, მოვხაზო სექტორის საზღვრები და დავამატო დავალება რუკაზე?'
    },
    {
        id: 'sop-mod-05',
        code: 'SOP-MOD-05',
        moduleMode: 'agronomy',
        category: 'Field & Agronomy',
        roles: ['agronomist', 'manager', 'founder', 'worker'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Agronomy, Fertigation, Spraying & Soil Laboratory',
        titleKa: 'აგრონომია, კვების გეგმები, შეწამვლა და ნიადაგის ლაბორატორია',
        purposeEn: 'Plan and execute nutrition/fertigation schedules, pesticide/fungicide spraying with PHI safety intervals, soil pH/NPK tracking, and AI leaf disease diagnostics.',
        purposeKa: 'კვებისა და ფერტიგაციის გეგმების შედგენა, შეწამვლის გრაფიკი, ნიადაგის pH/NPK ანალიზი და მცენარეთა დაავადებების AI დიაგნოსტიკა.',
        optionsEn: [
            'Nutrition & Fertigation Plan Builder (Dosage per Hectare / per Plant / per Water Tank)',
            'Spraying Calendar & PHI (Pre-Harvest Interval) Compliance Alerts',
            'Soil Lab Telemetry (pH, Nitrogen, Phosphorus, Potassium, EC, Moisture)',
            'AI Plant Pathology & Leaf Photo Scanner (auto-creates treatment tasks)',
            'Automatic Warehouse Chemical Deduction upon Plan Execution'
        ],
        optionsKa: [
            'კვების და ფერტიგაციის გეგმების შექმნა (დოზირება ჰექტარზე / ძირზე / ავზზე)',
            'შეწამვლის კალენდარი და ლოდინის პერიოდის (PHI) უსაფრთხოების კონტროლი',
            'ნიადაგის ლაბორატორია (pH, აზოტი, ფოსფორი, კალიუმი, ტენიანობა)',
            'ფოთლის/მცენარის ფოტო AI დიაგნოსტიკა და მკურნალობის დავალების ავტო-გენერაცია',
            'გეგმის შესრულებისას საწყობიდან სასუქების/პრეპარატების ავტომატური ჩამოწერა'
        ],
        stepsEn: [
            'Select the target Plantation Sector and Crop Variety in Agronomy.',
            'Create a Nutrition or Spraying Plan specifying chemicals from Warehouse Stock and exact dosages.',
            'Assign field workers or tractor operators to execute the treatment via Tasks.',
            'When the worker marks the treatment Executed, confirm chemical quantities are deducted from Warehouse Stock.',
            'Record soil test results (pH/NPK) after lab sampling to track seasonal trends.'
        ],
        stepsKa: [
            'აგრონომიის მოდულში აირჩიეთ სასურველი სექტორი და კულტურა.',
            'შექმენით კვების ან შეწამვლის გეგმა საწყობში არსებული პრეპარატებისა და ზუსტი დოზების მითითებით.',
            'მიანიჭეთ შესრულება საველე მუშაკს ან ტრაქტორისტს დავალებების მოდულში.',
            'სამუშაოს შესრულებულად მონიშვნისას სისტემა ავტომატურად ჩამოწერს გახარჯულ პრეპარატებს საწყობიდან.',
            'შეიტანეთ ნიადაგის ანალიზის შედეგები (pH/NPK) სეზონური დინამიკის სანახავად.'
        ],
        aiPromptEn: 'How do I create a fertigation or spraying plan in Agronomy and link chemical deductions to Warehouse Stock?',
        aiPromptKa: 'როგორ შევქმნა კვების ან შეწამვლის გეგმა აგრონომიაში და დავაკავშირო საწყობის ჩამოწერასთან?'
    },
    {
        id: 'sop-mod-06',
        code: 'SOP-MOD-06',
        moduleMode: 'tasks',
        category: 'Core Operations',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Work Orders, Tasks & Field Operations Planner',
        titleKa: 'სამუშაოები, დავალებები და საველე დამგეგმავი (Tasks & Planner)',
        purposeEn: 'Assign, track, and verify daily field tasks (pruning, weeding, irrigation, spraying, harvesting) with GPS sector pins, deadlines, and worker checklists.',
        purposeKa: 'ყოველდღიური საველე სამუშაოების (გასხვლა, გამარგვლა, მორწყვა, შეწამვლა) განაწილება, შესრულების კონტროლი და ვადების მართვა.',
        optionsEn: [
            'Task Creation Modal (Work Type, Priority, Sector, Assigned Employees, Machinery, Due Date)',
            'Status Pipeline: Pending → In Progress → Verification → Completed',
            'Worker Mobile View: My Assigned Tasks & 1-Tap Completion Confirmation',
            'Calendar / Agro Planner Schedule & Automated Deadline Alerts',
            'GPS Map Pinning directly from Tasks or Dashboard Map Context Menu'
        ],
        optionsKa: [
            'დავალების შექმნა (სამუშაოს ტიპი, პრიორიტეტი, სექტორი, თანამშრომლები, ტექნიკა, ვადა)',
            'სტატუსების ნაკადი: მოლოდინში → მიმდინარე → შემოწმება → დასრულებული',
            'მუშაკის ხედი: ჩემი დავალებები და შესრულების 1-კლიკით დადასტურება',
            'აგრო-კალენდარი და ვადების შეხსენებები',
            'GPS წერტილზე მიბმა პირდაპირ რუკიდან ან დავალებების სიიდან'
        ],
        stepsEn: [
            'Managers/Agronomists click New Work / Task, select the Sector, Task Type, Priority, and assigned Workers.',
            'Workers open Tasks at the start of their shift to inspect their assigned sector, instructions, and safety notes.',
            'Switch task status to In Progress when starting fieldwork and attach photos/notes if an anomaly is spotted.',
            'Mark the task Completed upon finishing so supervisors can verify and log labor hours into HR.'
        ],
        stepsKa: [
            'მენეჯერი ან აგრონომი ქმნის დავალებას, უთითებს სექტორს, სამუშაოს ტიპს, პრიორიტეტს და პასუხისმგებელ მუშაკებს.',
            'მუშაკები ცვლის დასაწყისში ხსნიან Tasks განყოფილებას და ეცნობიან თავიანთ სექტორსა და ინსტრუქციას.',
            'სამუშაოს დაწყებისას სტატუსი გადაჰყავთ „მიმდინარეზე“ (In Progress), საჭიროებისას ამატებენ ფოტოს ან შენიშვნას.',
            'დასრულებისას მონიშნავენ „შესრულებულად“ (Completed) ხელმძღვანელის დასადასტურებლად.'
        ],
        aiPromptEn: 'How should workers and managers create, update, and complete daily field tasks in the Tasks module?',
        aiPromptKa: 'როგორ უნდა შექმნან და დაასრულონ საველე დავალებები მენეჯერებმა და მუშაკებმა Tasks მოდულში?'
    },
    {
        id: 'sop-mod-07',
        code: 'SOP-MOD-07',
        moduleMode: 'harvesting',
        category: 'Harvest & Warehouse',
        roles: ['all', 'worker', 'manager', 'agronomist', 'founder'],
        sourceDoc: 'item_list.txt & docs/GURIA_PILOT.md',
        titleEn: 'Harvesting Operations & Live Scale Weigh Station (6 Protocols)',
        titleKa: 'მოსავლის აღება და ელექტრონული სასწორის პუნქტი (6 პროტოკოლი)',
        purposeEn: 'Execute harvest sessions with Bluetooth/USB scale integration, QR worker/crate scanning, automated tare deduction, piece-rate wage calculation, and warehouse stock sync.',
        purposeKa: 'მოსავლის აღების სესიების მართვა, სასწორზე აწონვა, QR სკანირება, ტარის ავტო-გამოქვითვა, მკრეფავის გამომუშავების და საწყობის ავტო-განახლება.',
        optionsEn: [
            'Harvest Session Creator (Crop, Variety, Target Sector, Active Date, Wage Rate per Kg/Box)',
            '6 Weighing Protocols: Live Digital Scale, Smart Crate Counting, Bulk Bin Weighing, QR Picker Scan, Pallet Aggregation, Offline Queue Entry',
            'Automatic Tare Deduction (Gross Weight − Crate/Punnet Weight = Net Harvest Weight)',
            'Real-Time Picker Leaderboard & Instant Piece-Rate Earnings Calculation',
            'Automatic Packaging Deduction (Crates/Punnets) & Finished Harvest Lot Creation in Warehouse'
        ],
        optionsKa: [
            'მოსავლის სესიის შექმნა (კულტურა, ჯიში, სექტორი, თარიღი, ტარიფი კგ-ზე ან ყუთზე)',
            'აწონვის 6 პროტოკოლი: ელექტრონული სასწორი, ყუთების თვლა, ბუნკერული აწონვა, მკრეფავის QR სკანირება, პალეტიზაცია, ოფლაინ რეჟიმი',
            'ტარის ავტომატური გამოქვითვა (ბრუტო − ყუთის წონა = სუფთა ნეტო წონა)',
            'მკრეფავების რეიტინგი და გამომუშავებული ხელფასის მომენტალური დათვლა',
            'საწყობიდან ტარის ავტომატური ჩამოწერა და მზა პროდუქციის ლოტის შექმნა'
        ],
        stepsEn: [
            'Before picking starts, verify Crates/Punnets are in Warehouse Stock and Pickers are registered in HR.',
            'Open Harvesting → Create Harvest Event, select Sector, Crop, Variety, and Piece-Rate tariff.',
            'At the Weigh Station, scan the Picker QR badge (or select Worker name), select Crate type for Tare deduction, and capture Gross Weight.',
            'Verify Net Weight and Quality Grade (Class A / Class B / Processing) then press Confirm Entry.',
            'If offline in the field (e.g., Guria Pilot mode), entries queue locally with idempotent tokens and auto-sync when connectivity returns.',
            'Close the Harvest Session at end of day to finalize worker payroll summaries and export/sell harvest lots.'
        ],
        stepsKa: [
            'კრეფის დაწყებამდე დარწმუნდით, რომ ყუთები/პუნეტები დამატებულია საწყობში, ხოლო მკრეფავები — HR სიაში.',
            'გახსენით მოსავლის აღება (Harvesting) → შექმენით სესია, მიუთითეთ სექტორი, კულტურა, ჯიში და კგ/ყუთის ტარიფი.',
            'ამწონ პუნქტზე დაასკანერეთ მკრეფავის QR ბარათი (ან აირჩიეთ სიიდან), მიუთითეთ ყუთის ტიპი ტარის გამოქვითვისთვის და დააფიქსირეთ წონა.',
            'გადაამოწმეთ სუფთა წონა (Net Weight) და ხარისხის კატეგორია (A / B / გადამუშავება) და დააჭირეთ დადასტურებას.',
            'ოფლაინ პირობებში ჩანაწერები უსაფრთხოდ ინახება ლოკალურად და ავტომატურად იგზავნება ინტერნეტის ან ლოკალური სერვერის დაკავშირებისთანავე.',
            'დღის ბოლოს დახურეთ სესია ხელფასებისა და საწყობის ნაშთების დასაფიქსირებლად.'
        ],
        aiPromptEn: 'Give me the exact Weigh Station SOP for harvesting: scanning pickers, tare weight deduction, offline entries, and closing the session.',
        aiPromptKa: 'მომეცი ამწონი პუნქტის ზუსტი SOP ინსტრუქცია: მკრეფავის სკანირება, ტარის გამოქვითვა, ოფლაინ აწონვა და სესიის დახურვა.'
    },
    {
        id: 'sop-mod-08',
        code: 'SOP-MOD-08',
        moduleMode: 'stock',
        category: 'Harvest & Warehouse',
        roles: ['manager', 'agronomist', 'accountant', 'founder', 'worker'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Warehouse, Inventory & Packaging Stock Control',
        titleKa: 'საწყობი, მარაგები და ტარის კონტროლი (Warehouse & Stock)',
        purposeEn: 'Track fertilizers, agrochemicals, packaging crates/punnets, spare parts, fuel, and harvested cold-storage lots with low-stock alerts and auto-deductions.',
        purposeKa: 'სასუქების, პრეპარატების, ყუთების/პუნეტების, საწვავის და მოსავლის სამაცივრე ლოტების აღრიცხვა მინიმალური ნაშთის შეტყობინებებით.',
        optionsEn: [
            'Item Categories: Agrochemicals, Fertilizers, Packaging (Crates/Punnets/Pallets), Seedlings, Fuel, Harvest Lots',
            'Inbound Stock Receiving (Purchase Invoice Upload + AI OCR Document Extraction)',
            'Outbound Issue & Automatic Deductions from Harvesting & Agronomy Spraying',
            'Low-Stock Threshold Alerts & Expiry Date Tracking',
            'Cold-Storage Lot Traceability (Sector → Harvest Date → Weight → Buyer Dispatch)'
        ],
        optionsKa: [
            'კატეგორიები: პრეპარატები, სასუქები, ტარა (ყუთები/პუნეტები/პალეტები), ნერგები, საწვავი, მოსავლის ლოტები',
            'შემოსავალში აყვანა (ზედნადების/ინვოისის ატვირთვა და AI წაკითხვა)',
            'გასავალი და ავტომატური ჩამოწერა მოსავლის აღებიდან და აგრონომიული შეწამვლიდან',
            'მინიმალური ნაშთის და ვარგისიანობის ვადის გაფრთხილებები',
            'სამაცივრე ლოტების მიკვლევადობა (სექტორი → კრეფის თარიღი → წონა → რეალიზაცია)'
        ],
        stepsEn: [
            'Register all packaging types (with exact Tare weight in grams/kg) and agrochemicals before the season begins.',
            'When new supplies arrive, click Add Stock or scan the supplier invoice to record quantity, unit price, and expiry date.',
            'Set Min-Stock Alert thresholds so Warehouse Managers are notified before crates or chemicals run out.',
            'Monitor auto-deduction logs daily to verify physical warehouse counts match digital stock balances.'
        ],
        stepsKa: [
            'სეზონის დაწყებამდე დაამატეთ ყველა სახის ტარა (ზუსტი წონის მითითებით) და აგრო-პრეპარატი.',
            'ახალი საქონლის მიღებისას დაამატეთ მარაგი ან დაასკანერეთ ინვოისი რაოდენობის, ფასის და ვადის დასაფიქსირებლად.',
            'დააყენეთ მინიმალური ნაშთის ზღვარი, რათა დროულად მიიღოთ შეტყობინება დეფიციტზე.',
            'ყოველდღიურად გადაამოწმეთ ავტომატური ჩამოწერის ჟურნალი ფიზიკურ ნაშთთან შესაბამისობისთვის.'
        ],
        aiPromptEn: 'How do I set up crates with tare weights, record incoming stock, and audit automatic warehouse deductions?',
        aiPromptKa: 'როგორ დავამატო ყუთები ტარის წონით, ავიყვანო შემოსავალში მარაგები და შევამოწმო ავტომატური ჩამოწერა?'
    },
    {
        id: 'sop-mod-09',
        code: 'SOP-MOD-09',
        moduleMode: 'tools',
        category: 'HR & Finance',
        roles: ['manager', 'accountant', 'founder', 'worker'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'HR, Workforce Roster, Attendance & Bulk Wage Management (Tools Module)',
        titleKa: 'HR, თანამშრომლები, დასწრება და ხელფასების მართვა (Tools მოდული)',
        purposeEn: 'Manage seasonal daily workers and permanent staff across 6 Tools tabs: HR Personnel, Daily Attendance, Machinery & Fleet, Wage Tariffs, Document Templates, and QR ID Badges.',
        purposeKa: 'სეზონური და მუდმივი პერსონალის მართვა Tools მოდულის 6 ჩანართში: HR რეესტრი, დასწრება, ტექნიკა, ტარიფები, შაბლონები და QR ბარათები.',
        optionsEn: [
            '6 Core Tools Tabs: Personnel Roster, Daily Attendance Sheet, Payroll & Bulk Wages, Machinery & Fleet, QR Badge Printer, Excel Import/Export',
            'HR Action Bar: Scan ID (AI OCR), Global Search (W-xxx), Download Template, Import List (CSV/XLSX), Export HR, Add Daily Worker',
            'Bulk Wage Controls: Apply Daily Rate / Hourly Rate / Piece-Rate per Kg or Box across selected teams',
            '1-Click Attendance Markers: Present, Late, Half-Day, Absent + Terminal PIN Check-In',
            'Machinery Logbook: Tractors, Sprayers, Maintenance Hours, Fuel Consumption'
        ],
        optionsKa: [
            'Tools მოდულის 6 ჩანართი: პერსონალის სია, ყოველდღიური დასწრება, ხელფასები, ტექნიკა, QR ბეიჯები, Excel იმპორტ/ექსპორტი',
            'HR მოქმედების ღილაკები: პირადობის სკანირება (Scan ID), გლობალური ძებნა, შაბლონის გადმოწერა, სიის იმპორტი, ექსპორტი, დღიური მუშაკის დამატება',
            'მასობრივი ტარიფების მართვა (Bulk Wage): დღიური, საათობრივი ან გამომუშავების ტარიფის მინიჭება ბრიგადებზე',
            'დასწრების 1-კლიკით აღრიცხვა (დამსწრე, დაგვიანებული, არმყოფი) და PIN ჩექ-ინი',
            'ტექნიკის ჟურნალი: ტრაქტორები, შესაწამლი აპარატები, სერვისი და საწვავი'
        ],
        stepsEn: [
            'To onboard a new worker fast, click Scan ID to auto-read their national ID card, or use Add Daily Worker / Import List (Excel template).',
            'Assign each worker a Role (Picker, Tractor Driver, Agronomist, Foreman) and their Wage Model (Daily Rate or Piece-Rate).',
            'Print or share the worker QR Badge (W-xxx ID) for fast check-in and Weigh Station scanning.',
            'Every morning, open Daily Attendance and mark shift presence in 1 click; use Bulk Wage controls to adjust seasonal rates cleanly.',
            'Export verified attendance and harvest earnings to Accounting for payroll payout.'
        ],
        stepsKa: [
            'ახალი მუშაკის სწრაფად დასამატებლად გამოიყენეთ Scan ID (პირადობის სკანირება), Add Daily Worker ან Excel სიის იმპორტი.',
            'მიანიჭეთ თანამშრომელს როლი (მკრეფავი, ტრაქტორისტი, აგრონომი, ბრიგადირი) და ანაზღაურების ტიპი (დღიური ან გამომუშავება).',
            'დაბეჭდეთ ან გაუზიარეთ მუშაკს QR ბეიჯი (W-xxx ID) სასწორზე და დასწრებაზე სწრაფი სკანირებისთვის.',
            'ყოველ დილით მონიშნეთ დასწრება 1 კლიკით; ტარიფების მასობრივი ცვლილებისთვის გამოიყენეთ Bulk Wage პანელი.',
            'გადაეცით დადასტურებული დასწრებისა და გამომუშავების უწყისი ბუღალტერიას ანაზღაურებისთვის.'
        ],
        aiPromptEn: 'Explain how to use HR & Tools: Scan ID, Excel Import, Bulk Wage controls, Daily Attendance, and QR worker badges.',
        aiPromptKa: 'ამიხსენი HR & Tools მოდულის გამოყენება: პირადობის სკანირება (Scan ID), Excel იმპორტი, Bulk Wage, დასწრება და QR ბარათები.'
    },
    {
        id: 'sop-mod-10',
        code: 'SOP-MOD-10',
        moduleMode: 'accounting',
        category: 'HR & Finance',
        roles: ['accountant', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Accounting, Ledger, Payroll Payouts & Financial P&L',
        titleKa: 'ბუღალტერია, ფინანსური ჟურნალი, ხელფასების გაცემა და P&L',
        purposeEn: 'Track cash/bank accounts, labor payroll OPEX, supplier invoices, harvest sales revenue, cost-per-kilogram analytics, and multi-currency (GEL/USD/EUR) ledgers.',
        purposeKa: 'სალაროსა და საბანკო ანგარიშების, სახელფასო ხარჯების, მომწოდებლების ინვოისების, გაყიდვების და თვითღირებულების კონტროლი.',
        optionsEn: [
            'Multi-Account Cash & Bank Balances (GEL / USD / EUR)',
            'Automated Labor Payroll Queue imported from HR Attendance & Harvest Piece-Rates',
            'Expense & Revenue Journal with Category Tagging (Labor, Chemicals, Fuel, Packaging, Harvest Sales)',
            'Invoice & Receipt AI Document Scanner',
            'Profit & Loss (P&L) Summary & Per-Sector Cost-per-Kg Profitability Reports'
        ],
        optionsKa: [
            'სალაროსა და ბანკის მულტისავალუტო ანგარიშები (GEL / USD / EUR)',
            'HR-დან და მოსავლის აღებიდან გადმოტანილი სახელფასო უწყისების გაცემა',
            'შემოსავლებისა და ხარჯების ჟურნალი კატეგორიების მიხედვით (შრომა, ქიმია, საწვავი, ტარა, გაყიდვა)',
            'ინვოისებისა და ქვითრების AI სკანერი',
            'მოგება-ზარალის (P&L) და 1 კგ პროდუქციის თვითღირებულების რეპორტები'
        ],
        stepsEn: [
            'Create Cash Box and Bank Accounts under Accounting → Accounts with opening balances.',
            'Review pending worker payroll generated from Daily Attendance and Harvest Sessions, then click Approve & Pay.',
            'Log supplier purchases (or scan receipts) so both Warehouse Stock and Financial OPEX stay synchronized.',
            'Record harvest lot sales against buyer invoices to generate real-time seasonal P&L and cash flow.'
        ],
        stepsKa: [
            'შექმენით სალაროსა და ბანკის ანგარიშები საწყისი ნაშთებით.',
            'გადაამოწმეთ დასწრებიდან და მოსავლიდან დაანგარიშებული სახელფასო უწყისები და დაადასტურეთ გაცემა.',
            'დაარეგისტრირეთ შესყიდვების ხარჯები (ან დაასკანერეთ ინვოისი), რათა საწყობი და ფინანსები თანხვედრაში იყოს.',
            'დააფიქსირეთ მოსავლის გაყიდვები რეალური მოგება-ზარალის (P&L) და თვითღირებულების სანახავად.'
        ],
        aiPromptEn: 'How do I process worker payroll payouts, log expenses, and check cost-per-kg profitability in Accounting?',
        aiPromptKa: 'როგორ გავცე თანამშრომელთა ხელფასები, აღვრიცხო ხარჯები და ვნახო თვითღირებულება ბუღალტერიაში?'
    },
    {
        id: 'sop-mod-11',
        code: 'SOP-MOD-11',
        moduleMode: 'marketplace',
        category: 'Market & Communications',
        roles: ['all', 'buyer', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Wholesale Marketplace, Job Board & Partner Discovery',
        titleKa: 'აგრო-მარკეტი, ვაკანსიები და პარტნიორების მოძიება',
        purposeEn: 'Publish verified harvest lots for B2B wholesale buyers, hire seasonal workers/agronomists, or offer agricultural machinery & consulting services.',
        purposeKa: 'ვერიფიცირებული მოსავლის ლოტების განთავსება საბითუმო მყიდველებისთვის, პერსონალის დაქირავება და აგრო-სერვისების შეთავაზება.',
        optionsEn: [
            'Wholesale Produce Listings (Crop, Variety, Grade, Available Kg, Price/Kg, Harvest Location)',
            'Find Partner & Work Board (Job Vacancies for Pickers, Agronomists, Operators)',
            'Agricultural Service Offerings (Tractor Work, Drone Spraying, Cold Storage, Transport)',
            'Direct Buyer Inquiries & Order-to-Accounting Settlement'
        ],
        optionsKa: [
            'საბითუმო მოსავლის განცხადებები (კულტურა, ჯიში, ხარისხი, წონა, ფასი, ლოკაცია)',
            'პარტნიორებისა და სამუშაოს ძიების დაფა (ვაკანსიები მკრეფავებისთვის, აგრონომებისთვის, ოპერატორებისთვის)',
            'აგრო-სერვისების განცხადებები (ტრაქტორი, დრონით შეწამვლა, სამაცივრე, ტრანსპორტი)',
            'პირდაპირი შეთავაზებები მყიდველებთან და გაყიდვის ასახვა ფინანსებში'
        ],
        stepsEn: [
            'To sell produce, open Marketplace → Create Listing and link directly to an active Harvest Lot or Warehouse stock.',
            'To hire staff or find work, filter listings by Jobs / Partners and submit your verified profile.',
            'Confirm price, quantity, and pickup logistics in direct chat before finalizing dispatch.'
        ],
        stepsKa: [
            'მოსავლის გასაყიდად გახსენით Marketplace → შექმენით განცხადება და მიაბით მოსავლის ლოტს.',
            'სამუშაოს ან პარტნიორის მოსაძებნად გაფილტრეთ ვაკანსიები და გაგზავნეთ თქვენი ვერიფიცირებული პროფილი.',
            'შეათანხმეთ ფასი, რაოდენობა და ტრანსპორტირება მყიდველთან საქონლის გატანამდე.'
        ],
        aiPromptEn: 'How do I list a harvest lot on the Wholesale Marketplace or apply for farm work via Find Partner & Work?',
        aiPromptKa: 'როგორ განვათავსო მოსავლის ლოტი მარკეტპლეისზე ან როგორ ვიპოვო სამუშაო პარტნიორების დაფაზე?'
    },
    {
        id: 'sop-mod-12',
        code: 'SOP-MOD-12',
        moduleMode: 'ai',
        category: 'Field & Agronomy',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'AI Intelligence Suite, Plant Diagnostics & Tools AI Guide',
        titleKa: 'AI ანალიტიკის სუიტა, დიაგნოსტიკა და ხელსაწყოების AI ასისტენტი',
        purposeEn: 'Use AI Guide Assistant for step-by-step operational help, scan crop leaves/pests for diagnosis, OCR supplier invoices, and run cross-module anomaly audits.',
        purposeKa: 'AI გზამკვლევი ასისტენტის გამოყენება ინსტრუქციებისთვის, ფოთლების/მავნებლების ფოტო დიაგნოსტიკა, დოკუმენტების სკანირება და ანომალიების ანალიზი.',
        optionsEn: [
            'Floating Tools Dock (…) → AI Assistant (starts directly in AI Guide Assistant with Copilot & Diagnostics tabs)',
            'Leaf & Plant Disease Photo Scanner (returns diagnosis, treatment chemicals & creates Agronomy tasks)',
            'Purchase Invoice / Document OCR Reader (extracts line items for Stock & Accounting)',
            'Cross-Module Anomaly Detector (flags stock shortages, wage spikes, missed sprays, and harvest variance)',
            'Voice Notes & Field Dictation (convert spoken field observations to GPS-tagged notes)'
        ],
        optionsKa: [
            'მოძრავი ხელსაწყოების პანელი (…) → AI ასისტენტი (იხსნება პირდაპირ AI Guide Assistant-ით, ასევე Copilot და დიაგნოსტიკა)',
            'ფოთლისა და მცენარის დაავადებების ფოტო სკანერი (დიაგნოზი, პრეპარატი და დავალების შექმნა)',
            'ინვოისებისა და ზედნადებების AI OCR წაკითხვა საწყობისა და ბუღალტერიისთვის',
            'მოდულთაშორისი ანომალიების დეტექტორი (მარაგის დეფიციტი, ხარჯის გადახრა, გამოტოვებული შეწამვლა)',
            'ხმოვანი ჩანაწერები (Voice Notes) საველე დაკვირვებების დასაფიქსირებლად'
        ],
        stepsEn: [
            'Click the floating Tools button (…) at bottom-right and choose AI Assistant — it opens directly in AI Guide Assistant for instant help.',
            'Switch to the Diagnostics tab (or open AI Agro Analyst) to upload a leaf photo for disease/pest identification.',
            'Use the clickable Action buttons returned by AI Guide Assistant to jump directly to the required module.',
            'Managers can review the AI Autonomous Stream widget on the Dashboard to resolve cross-module alerts.'
        ],
        stepsKa: [
            'დააჭირეთ ეკრანის ქვედა მარჯვენა ხელსაწყოების ღილაკს (…) და აირჩიეთ AI ასისტენტი — ის პირდაპირ AI Guide Assistant-ით გაიხსნება.',
            'მცენარის ფოტო დიაგნოსტიკისთვის გადართეთ Diagnostics ჩანართზე ან გახსენით AI Agro Analyst.',
            'გამოიყენეთ AI ასისტენტის პასუხებში მოცემული სწრაფი ღილაკები საჭირო მოდულში გადასასვლელად.',
            'მენეჯერებს შეუძლიათ Dashboard-ის AI Stream ვიჯეტიდან აკონტროლონ სისტემური ანომალიები.'
        ],
        aiPromptEn: 'What can I do with the Tools AI Assistant, Leaf Disease Diagnostics, and Document OCR scanner?',
        aiPromptKa: 'რა შესაძლებლობები აქვს Tools AI ასისტენტს, ფოთლის დიაგნოსტიკას და დოკუმენტების OCR სკანერს?'
    },
    {
        id: 'sop-mod-13',
        code: 'SOP-MOD-13',
        moduleMode: 'dashboard',
        category: 'Offline & Local Server',
        roles: ['all', 'worker', 'manager', 'agronomist', 'founder'],
        sourceDoc: 'docs/LOCAL_SERVER.md & docs/GURIA_PILOT.md',
        titleEn: 'Offline Operations, LAN Local Server Node & Guria Pilot Workflow',
        titleKa: 'ოფლაინ რეჟიმი, ლოკალური LAN სერვერი და გურიის პილოტის SOP',
        purposeEn: 'Guarantee 100% uninterrupted field harvesting, QR weighing, and GPS worker logging in rural orchards with poor cellular coverage via Local Server Node & Offline Cache.',
        purposeKa: 'უწყვეტი საველე მუშაობა (მოსავლის აწონვა, QR სკანირება, დასწრება) სუსტი ინტერნეტის პირობებში ლოკალური LAN სერვერისა და ოფლაინ ქეშის მეშვეობით.',
        optionsEn: [
            'Browser Offline Cache (IndexedDB / LocalStorage) with Idempotent Sync Queue',
            'Local Server Node (LAN http://0.0.0.0:8080) with /health, /api/local/plantation, /api/local/harvest/entry, and /api/sync/push',
            'Guria Pilot Workflows: Hazelnuts, Blueberries & Tea offline QR crate weighing',
            'GPS Picker Productivity Tracking & Microclimate Soil Sensor Telemetry',
            'Automatic Cloud Reconciliation when Internet Connection Resumes'
        ],
        optionsKa: [
            'ბრაუზერის ოფლაინ ქეში და უსაფრთხო სინქრონიზაციის რიგი (დუბლირების გარეშე)',
            'ლოკალური LAN სერვერის კვანძი (პორტი 8080) საველე პლანშეტებისა და სასწორებისთვის',
            'გურიის პილოტის პროტოკოლები: თხილის, მოცვის და ჩაის ოფლაინ QR აწონვა',
            'მკრეფავების GPS პროდუქტიულობა და მიკროკლიმატის სენსორების ტელემეტრია',
            'ავტომატური ღრუბლოვანი სინქრონიზაცია ინტერნეტის აღდგენისთანავე'
        ],
        stepsEn: [
            'Before heading to an offline field, open AgriMap Pro while online so your active plantation map, workers, and stock cache locally.',
            'If a Local Farm Server Node is running on orchard Wi-Fi, connect tablets to the local IP (port 8080) and verify green Local Node status in the top bar.',
            'Continue recording attendance, tasks, and harvest weights normally — do NOT clear browser data while offline entries are queued.',
            'Upon returning to Wi-Fi/4G coverage, keep the app open until the Cloud Sync status confirms all buffered entries are pushed.'
        ],
        stepsKa: [
            'ოფლაინ ზონაში გასვლამდე გახსენით აპლიკაცია ინტერნეტში, რათა რუკა, თანამშრომლები და მარაგები ლოკალურად დაქეშდეს.',
            'თუ ფერმაში მუშაობს ლოკალური LAN სერვერი (პორტი 8080), დაუკავშირდით ფერმის Wi-Fi-ს და გადაამოწმეთ Local Node-ის მწვანე სტატუსი.',
            'გააგრძელეთ აწონვა და დასწრების აღრიცხვა ჩვეულებრივ — არ გაასუფთაოთ ბრაუზერის მეხსიერება სინქრონიზაციამდე.',
            'ინტერნეტში დაბრუნებისას დატოვეთ აპლიკაცია გახსნილი, სანამ Cloud Sync არ დაადასტურებს ყველა ჩანაწერის ატვირთვას.'
        ],
        aiPromptEn: 'How do Offline Mode and the Local Server Node work during field harvesting when there is no internet?',
        aiPromptKa: 'როგორ მუშაობს ოფლაინ რეჟიმი და ლოკალური LAN სერვერი მოსავლის აღებისას უინტერნეტო ზონაში?'
    },
    {
        id: 'sop-mod-14',
        code: 'SOP-MOD-14',
        moduleMode: 'dashboard',
        category: 'Market & Communications',
        roles: ['all', 'worker', 'agronomist', 'manager', 'founder'],
        sourceDoc: 'item_list.txt & AGRIMAP_PRO_ARCHITECTURE_V18.md',
        titleEn: 'Team Hubs, Field Intercom, Chat & Video Meet',
        titleKa: 'გუნდის კომუნიკაცია, საველე ინტერკომი, ჩატი და ვიდეო შეხვედრები',
        purposeEn: 'Coordinate field crews, supervisors, and agronomists via instant Team Chat, Field Intercom announcements, live Map Showcases, and Video Meetings.',
        purposeKa: 'საველე ბრიგადების, მენეჯერებისა და აგრონომების კოორდინაცია გუნდური ჩატით, ინტერკომით და ვიდეო შეხვედრებით.',
        optionsEn: [
            'Team Hubs Widget & Floating Communication Hub',
            'Field Intercom Broadcasts for urgent weather, spray, or shift notices',
            'Direct & Group Chats linked to Organization Members',
            'Live Map Drawing Showcase during Video / Meet calls',
            'Voice Notes Sharing with GPS Coordinates'
        ],
        optionsKa: [
            'გუნდის კომუნიკაციის ჰაბი და მოძრავი ჩატის ფანჯარა',
            'საველე ინტერკომი სასწრაფო ამინდის, შეწამვლის ან ცვლის შეტყობინებებისთვის',
            'პირადი და ჯგუფური ჩატები კომპანიის თანამშრომლებს შორის',
            'რუკის ცოცხალი გაზიარება და ხაზვა ვიდეო ზარის დროს',
            'ხმოვანი შენიშვნების გაგზავნა GPS კოორდინატებით'
        ],
        stepsEn: [
            'Open Team Hubs from the Dashboard or floating Tools dock to message your supervisor or team.',
            'Use Field Intercom for company-wide shift schedules, safety alerts, or harvest dispatch notices.',
            'When reporting a field issue (broken pipe, pest outbreak), attach a Voice Note or pin the exact GPS location.'
        ],
        stepsKa: [
            'გახსენით Team Hubs დაფიდან ან მოძრავი ხელსაწყოებიდან ხელმძღვანელთან ან გუნდთან დასაკავშირებლად.',
            'გამოიყენეთ საველე ინტერკომი საერთო ცვლის განრიგისა და სასწრაფო გაფრთხილებების გასაგზავნად.',
            'საველე პრობლემის (მილის დაზიანება, მავნებელი) შეტყობინებისას დაურთეთ ხმოვანი ჩანაწერი ან GPS კოორდინატი.'
        ],
        aiPromptEn: 'How do workers and managers use Team Hubs, Field Intercom, and Voice Notes for field coordination?',
        aiPromptKa: 'როგორ გამოვიყენოთ Team Hubs, საველე ინტერკომი და ხმოვანი ჩანაწერები გუნდის კოორდინაციისთვის?'
    },
    {
        id: 'sop-mod-15',
        code: 'SOP-MOD-15',
        moduleMode: 'admin',
        category: 'System Administration',
        roles: ['root'],
        rootOnly: true,
        sourceDoc: 'AGRIMAP_PRO_ARCHITECTURE_V18.md & docs/REVIEW_AND_HANDOVER.md',
        titleEn: 'Root User Control Center, RBAC Matrix & Data Migration Bridge',
        titleKa: 'Root მართვის ცენტრი, RBAC უფლებების მატრიცა და მონაცემთა მიგრაცია',
        purposeEn: 'Exclusive Root & Owner console for global user/company verification, 8-role RBAC permission governance, Maintenance Mode, AI Architecture downloads, and QA handover.',
        purposeKa: 'მხოლოდ Root და მფლობელის კონსოლი: გლობალური ვერიფიკაცია, 8-როლიანი RBAC უფლებები, სერვის-რეჟიმი, AI არქიტექტურა და მიგრაცია.',
        optionsEn: [
            'Global User & Company KYC Approval Queue (approve/suspend/verify entities)',
            '8-Role Hierarchical RBAC Permissions Matrix (Root, Founder, Co-Founder, Admin, Manager, Agronomist, Accountant, Worker)',
            'Maintenance Mode Switch & System-Wide Broadcast Banners',
            'Data Migration Bridge & Backup Snapshots (JSON / Firestore / Local Node)',
            'AI Module Architecture Analyzer & Executive Spec Downloads (Root-Only)'
        ],
        optionsKa: [
            'მომხმარებლებისა და კომპანიების გლობალური KYC დადასტურების რიგი',
            '8-როლიანი იერარქიული RBAC უფლებების მატრიცა',
            'ტექნიკური მომსახურების რეჟიმი (Maintenance Mode) და გლობალური შეტყობინებები',
            'მონაცემთა მიგრაციის ხიდი და სარეზერვო ასლები',
            'AI მოდულების არქიტექტურის ანალიზატორი და სპეციფიკაციების ჩამოტვირთვა (მხოლოდ Root)'
        ],
        stepsEn: [
            'Verify new user KYC submissions and company registrations promptly in the Root Control Center.',
            'Audit role assignments against the Global Permissions Matrix before promoting users to Manager or Admin.',
            'Enable Maintenance Mode before executing schema migrations or bulk data bridge transfers.',
            'Use the QA Review & Handover checklist before releasing new field updates.'
        ],
        stepsKa: [
            'Root კონსოლიდან დაადასტურეთ ახალი მომხმარებლების KYC და კომპანიების რეგისტრაციები.',
            'როლების მინიჭებამდე გადაამოწმეთ წვდომის უფლებები გლობალურ RBAC მატრიცაში.',
            'მასობრივი მიგრაციის წინ გაააქტიურეთ Maintenance Mode უსაფრთხოებისთვის.',
            'ყოველი განახლების წინ გაიარეთ REVIEW_AND_HANDOVER QA ჩეკლისტი.'
        ],
        aiPromptEn: 'Summarize the Root User Control Center capabilities, 8-role RBAC permissions matrix, and Maintenance Mode SOP.',
        aiPromptKa: 'ამიხსენი Root მართვის ცენტრის ფუნქციები, 8-როლიანი RBAC მატრიცა და Maintenance Mode-ის SOP.'
    }
];

export const isUserOwnerOrRoot = (user?: any): boolean => {
    if (!user) return false;
    const email = String(user.email || '').trim().toLowerCase();
    const id = String(user.id || '').trim().toLowerCase();
    const roles: string[] = Array.isArray(user.roles) ? user.roles.map((r: any) => String(r).toLowerCase()) : [];
    const singleRole = String(user.role || user.activeRole || '').toLowerCase();

    const ownerEmails = new Set([
        'giorgi.nishno@gmail.com',
        'giorgi@agrimap.pro',
        'nishno@agrimap.pro',
        'admin@agrimap.io'
    ]);

    if (ownerEmails.has(email)) return true;
    if (id === 'root-system' || user.isRoot === true) return true;
    if (roles.some(r => ['root_super_admin', 'root', 'superadmin', 'super_admin'].includes(r))) return true;
    if (['root_super_admin', 'root', 'superadmin', 'super_admin'].includes(singleRole)) return true;
    return false;
};
