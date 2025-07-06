import { useState, useEffect } from "react"; // Import useEffect
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import syllabus from "../app/pearson_syllabus_library.json"; // Reverted path back to ../app/pearson_syllabus_library.json

// Define the interfaces for your data structure
// Represents a single topic entry within a year
interface TopicEntry {
  topic: string;
  code: string;
}

// Represents the topics for a specific year, as structured in the output map
interface YearTopics {
  year: string;
  topics: TopicEntry[];
}

// Represents the structure of a single subject's years from the raw syllabus JSON
interface SubjectYears {
  [year: string]: TopicEntry[]; // e.g., { "Year 7": [{ topic: "...", code: "..." }] }
}

// Represents the overall structure of the imported syllabus JSON
interface SyllabusData {
  [subject: string]: SubjectYears; // e.g., { "English": { "Year 7": [...] } }
}

/**
 * Transforms the raw syllabus data into a flattened progression map.
 * This map groups topics by subject and then by sorted year.
 * @param data The raw syllabus data from the JSON file.
 * @returns A map where keys are subjects and values are arrays of year-topic objects.
 */
const extractProgression = (data: SyllabusData): { [key: string]: YearTopics[] } => {
  const map: { [key: string]: YearTopics[] } = {}; // Explicitly type the map
  for (const subject in data) {
    map[subject] = [];
    const years = data[subject];
    // Sort years numerically based on the number in "Year X"
    const sortedYears = Object.keys(years).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10); // Safely extract number
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10); // Safely extract number
      return numA - numB;
    });

    for (const year of sortedYears) {
      const topics: TopicEntry[] = years[year].map((entry) => ({
        year,
        topic: entry.topic,
        code: entry.code,
      }));
      map[subject].push({ year, topics });
    }
  }
  return map;
};

// Process the syllabus data once when the component loads
const curriculumData = extractProgression(syllabus as SyllabusData); // Cast syllabus to SyllabusData

/**
 * Main Curriculum Progression component.
 * Manages user progress, allows switching between users, and displays a leaderboard.
 */
export default function CurriculumProgression() {
  // State to manage the active user, initialized with a default value.
  // Actual loading from localStorage happens in useEffect.
  const [user, setUser] = useState<string>("guest");
  // State to manage the progress for the current user, initialized with an empty object.
  // Actual loading from localStorage happens in useEffect.
  const [progress, setProgress] = useState<{ [code: string]: boolean }>({});
  // State for displaying messages related to import operations
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // useEffect to load user and progress from localStorage on client-side mount
  // This ensures localStorage is only accessed in the browser environment.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("active-user") || "guest";
      setUser(storedUser);

      const storedProgress = localStorage.getItem(`curriculum-progress-${storedUser}`);
      setProgress(storedProgress ? JSON.parse(storedProgress) : {});
    }
  }, []); // Empty dependency array means this runs once on mount

  // useEffect to update progress when the 'user' state changes
  // This handles switching between different users' progress.
  useEffect(() => {
    if (typeof window !== "undefined" && user) { // Ensure window is defined and user is not null/undefined
      const savedProgress = localStorage.getItem(`curriculum-progress-${user}`);
      setProgress(savedProgress ? JSON.parse(savedProgress) : {});
    }
  }, [user]); // Re-run this effect whenever the 'user' state changes

  /**
   * Toggles the completion status of a topic by its code.
   * Updates local storage with the new progress and timestamp.
   * @param code The unique code of the topic to toggle.
   */
  const toggleTopic = (code: string) => {
    setProgress((prev) => {
      const updated = { ...prev, [code]: !prev[code] };
      if (typeof window !== "undefined") {
        localStorage.setItem(`curriculum-progress-${user}`, JSON.stringify(updated));
        localStorage.setItem(`curriculum-timestamp-${user}`, new Date().toISOString());
      }
      return updated;
    });
  };

  /**
   * Resets the progress for the current user.
   * Clears the progress from local storage.
   */
  const resetProgress = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`curriculum-progress-${user}`);
      localStorage.removeItem(`curriculum-timestamp-${user}`); // Also remove timestamp on reset
    }
    setProgress({});
  };

  /**
   * Calculates the completion percentage for a given set of topics.
   * @param topics An array of topic entries.
   * @returns The percentage of topics completed (rounded to nearest integer).
   */
  const calculateProgress = (topics: TopicEntry[]): number => {
    const total = topics.length;
    if (total === 0) return 0; // Avoid division by zero
    const completed = topics.filter((t) => progress[t.code]).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <Tabs defaultValue="English" className="w-full p-4 font-inter"> {/* Added font-inter */}
      {/* User selection, Export, and Import controls */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-3">
          <label htmlFor="user" className="text-sm font-medium text-gray-700">User:</label>
          <select
            id="user"
            value={user}
            onChange={(e) => {
              const newUserName = e.target.value || "guest";
              setUser(newUserName); // This will trigger the useEffect for loading progress
              if (typeof window !== "undefined") {
                localStorage.setItem("active-user", newUserName);
              }
            }}
            className="border border-gray-300 px-3 py-1 text-sm rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            {/* Dynamically generate user options from localStorage */}
            {typeof window !== "undefined" && // Ensure localStorage is available before accessing
              ["guest", ...Object.keys(localStorage)
                .filter((key) => key.startsWith("curriculum-progress-"))
                .map((key) => key.replace("curriculum-progress-", ""))
                .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
                .sort((a, b) => a.localeCompare(b))] // Sort alphabetically
                .map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
          </select>

          {/* Export Button */}
          <button
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md shadow-sm hover:bg-blue-600 transition-colors duration-200"
            onClick={() => {
              if (typeof window !== "undefined") { // Guard localStorage access
                const dataStr = JSON.stringify(progress, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${user}-progress.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            Export Progress
          </button>

          {/* Import Button (hidden file input) */}
          <label htmlFor="import" className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-md shadow-sm hover:bg-gray-300 cursor-pointer transition-colors duration-200">
            Import Progress
            <input
              id="import"
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0]; // Use optional chaining for safety
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target?.result as string); // Cast result to string
                    if (typeof window !== "undefined") { // Guard localStorage access
                      localStorage.setItem(`curriculum-progress-${user}`, JSON.stringify(data));
                      localStorage.setItem(`curriculum-timestamp-${user}`, new Date().toISOString());
                    }
                    setProgress(data);
                    setImportMessage("Progress imported successfully!");
                  } catch {
                    setImportMessage("Invalid JSON file. Please ensure it's a valid progress file.");
                    console.error("Failed to parse imported JSON file.");
                  } finally {
                    // Clear message after some time
                    setTimeout(() => setImportMessage(null), 5000);
                  }
                };
                reader.readAsText(file);
              }}
              className="hidden"
            />
          </label>
        </div>

        {/* Import message display */}
        {importMessage && (
          <div className={`text-sm py-1 px-3 rounded-md ${importMessage.includes("Invalid") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {importMessage}
          </div>
        )}

        {/* Reset Progress Button */}
        <button
          onClick={resetProgress}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded-md shadow-sm hover:bg-red-600 transition-colors duration-200"
        >
          Reset Progress
        </button>
      </div>

      {/* Subject Tabs List */}
      <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-1 bg-gray-100 rounded-lg shadow-inner">
        {Object.keys(curriculumData).map((subject) => (
          <TabsTrigger
            key={subject}
            value={subject}
            className="flex-grow py-2 px-4 text-sm font-medium text-gray-700 rounded-md data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-200"
          >
            {subject}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Content for each subject tab */}
      {Object.entries(curriculumData).map(([subject, years]) => {
        const allTopics = years.flatMap((y) => y.topics);
        const completed = allTopics.filter((t) => progress[t.code]).length;
        const total = allTopics.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const remaining = total - completed;

        return (
          <TabsContent key={subject} value={subject} className="mt-4">
            <div className="flex justify-end text-sm text-gray-700 pr-4 pt-2 mb-2">
              <span className="font-semibold">{`${percent}% total completed`}</span>
              <span className="ml-2 text-gray-600">{`— ${remaining} topics remaining`}</span>
            </div>
            <Card className="rounded-xl shadow-lg border border-gray-200">
              <CardContent className="p-6">
                <div className="space-y-8">
                  {years.map((yearData, index) => {
                    const progressPercent = calculateProgress(yearData.topics);
                    return (
                      <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-xl text-gray-800">{yearData.year}</h3>
                          <span className="text-base font-medium text-blue-600">{progressPercent}% completed</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {yearData.topics.map((item) => {
                            const isChecked = !!progress[item.code];
                            return (
                              <label
                                key={item.code}
                                className={`flex items-center gap-3 p-4 border rounded-xl shadow-sm cursor-pointer transition-all duration-200 ease-in-out
                                  ${isChecked ? "bg-green-50 border-green-400 text-green-800 line-through opacity-80" : "bg-white border-gray-200 text-gray-900 hover:border-blue-300 hover:shadow-md"}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleTopic(item.code)}
                                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                                <span className="text-base">{item.topic}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}

      {/* Leaderboard Section */}
      <Card className="mt-8 rounded-xl shadow-lg border border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Leaderboard</h2>
          {(() => {
            // Retrieve all user progress from localStorage
            // Ensure localStorage is available before accessing
            const userProgress = typeof window !== "undefined"
              ? Object.keys(localStorage)
                  .filter((key) => key.startsWith("curriculum-progress-"))
                  .map((key) => {
                    const name = key.replace("curriculum-progress-", "");
                    const saved = JSON.parse(localStorage.getItem(key) || '{}'); // Handle null/empty saved data
                    const allCodes = Object.values(curriculumData)
                      .flatMap((y) => y.flatMap((lvl) => lvl.topics))
                      .map((t) => t.code);
                    const completed = allCodes.filter((code) => saved[code]).length;
                    const totalTopics = allCodes.length;
                    const percent = totalTopics > 0 ? Math.round((completed / totalTopics) * 100) : 0;
                    const timestamp = localStorage.getItem(`curriculum-timestamp-${name}`);
                    return { name, percent, timestamp };
                  })
                  .sort((a, b) => b.percent - a.percent) // Sort by percentage, descending
              : []; // Return empty array if localStorage is not defined

            const maxPercent = userProgress.length > 0 ? Math.max(...userProgress.map((u) => u.percent)) : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProgress.map(({ name, percent, timestamp }) => (
                  <div
                    key={name}
                    className={`p-4 border rounded-xl shadow-md transition-all duration-200 ease-in-out
                      ${percent === maxPercent && maxPercent > 0 ? "bg-yellow-100 border-yellow-500 ring-2 ring-yellow-300" : "bg-white border-gray-200"}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-lg text-gray-800">
                        {name} {percent === maxPercent && maxPercent > 0 ? "🥇" : ""}
                      </span>
                      <span className="text-sm text-gray-600 text-right">
                        <span className="font-bold text-blue-600">{percent}% completed</span><br />
                        <span className="text-xs text-gray-500">{timestamp ? new Date(timestamp).toLocaleString() : 'No activity yet'}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </Tabs>
  );
}

