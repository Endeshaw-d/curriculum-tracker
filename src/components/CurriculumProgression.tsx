import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import syllabus from "../app/pearson_syllabus_library.json";

// Transform the syllabus into a flat progression map
const extractProgression = (data) => {
  const map = {};
  for (const subject in data) {
    map[subject] = [];
    const years = data[subject];
    const sortedYears = Object.keys(years).sort((a, b) => a.match(/\d+/)[0] - b.match(/\d+/)[0]);
    for (const year of sortedYears) {
      const topics = years[year].map((entry) => ({
        year,
        topic: entry.topic,
        code: entry.code,
      }));
      map[subject].push({ year, topics });
    }
  }
  return map;
};

const curriculumData = extractProgression(syllabus);

export default function CurriculumProgression() {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active-user") || "guest";
    }
    return "guest";
  });

  const [progress, setProgress] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`curriculum-progress-${user}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const toggleTopic = (code) => {
    setProgress((prev) => {
      const updated = { ...prev, [code]: !prev[code] };
      if (typeof window !== "undefined") {
        localStorage.setItem(`curriculum-progress-${user}`, JSON.stringify(updated));
        localStorage.setItem(`curriculum-timestamp-${user}`, new Date().toISOString());
      }
      return updated;
    });
  };

  const resetProgress = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`curriculum-progress-${user}`);
    }
    setProgress({});
  };

  const calculateProgress = (topics) => {
    const total = topics.length;
    const completed = topics.filter((t) => progress[t.code]).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <Tabs defaultValue="English" className="w-full p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="user" className="text-sm font-medium">User:</label>
          <select
            id="user"
            value={user}
            onChange={(e) => {
              const name = e.target.value || "guest";
              setUser(name);
              localStorage.setItem("active-user", name);
              const saved = localStorage.getItem(`curriculum-progress-${name}`);
              setProgress(saved ? JSON.parse(saved) : {});
            }}
            className="border px-2 py-1 text-sm rounded"
          >
            {["guest", ...Object.keys(localStorage)
              .filter((key) => key.startsWith("curriculum-progress-") && key !== `curriculum-progress-${user}`)
              .map((key) => key.replace("curriculum-progress-", ""))
              .filter((value, index, self) => self.indexOf(value) === index)]
              .map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
          </select>

          <button
            className="ml-2 text-sm underline text-blue-600 hover:text-blue-800"
            onClick={() => {
              const dataStr = JSON.stringify(progress, null, 2);
              const blob = new Blob([dataStr], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${user}-progress.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </button>

          <label htmlFor="import" className="ml-2 text-sm underline text-blue-600 hover:text-blue-800 cursor-pointer">
            Import
            <input
              id="import"
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
	                
		reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target.result);
                    localStorage.setItem(`curriculum-progress-${user}`, JSON.stringify(data));
                    setProgress(data);
                  } catch { // Corrected line: 'err' changed to '_err'
                    alert("Invalid JSON file");
                  }
                };
                reader.readAsText(file);
              }}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={resetProgress}
          className="text-sm text-red-600 underline hover:text-red-800"
        >
          Reset Progress
        </button>
      </div>

      <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1">
        {Object.keys(curriculumData).map((subject) => (
          <TabsTrigger key={subject} value={subject}>
            {subject}
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.entries(curriculumData).map(([subject, years]) => {
        const allTopics = years.flatMap((y) => y.topics);
        const completed = allTopics.filter((t) => progress[t.code]).length;
        const total = allTopics.length;
        const percent = Math.round((completed / total) * 100);
        const remaining = total - completed;

        return (
          <TabsContent key={subject} value={subject}>
            <div className="flex justify-end text-sm text-gray-700 pr-4 pt-2">
              {`${percent}% total completed — ${remaining} topics remaining`}
            </div>
            <Card className="mt-4">
              <CardContent>
                <div className="space-y-6">
                  {years.map((yearData, index) => {
                    const progressPercent = calculateProgress(yearData.topics);
                    return (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-lg">{yearData.year}</h3>
                          <span className="text-sm text-gray-600">{progressPercent}% completed</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {yearData.topics.map((item) => {
                            const isChecked = !!progress[item.code];
                            return (
                              <label
                                key={item.code}
                                className={`flex items-center gap-2 p-2 border rounded-xl shadow-sm transition-colors duration-200 ${
                                  isChecked ? "bg-green-100 border-green-400 text-green-800 line-through" : "bg-white"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleTopic(item.code)}
                                />
                                <span>{item.topic}</span>
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

      <Card className="mt-8">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          {(() => {
            const userProgress = Object.keys(localStorage)
              .filter((key) => key.startsWith("curriculum-progress-"))
              .map((key) => {
                const name = key.replace("curriculum-progress-", "");
                const saved = JSON.parse(localStorage.getItem(key));
                const allCodes = Object.values(curriculumData)
                  .flatMap((y) => y.flatMap((lvl) => lvl.topics))
                  .map((t) => t.code);
                const completed = allCodes.filter((code) => saved[code]).length;
                const percent = Math.round((completed / allCodes.length) * 100);
                const timestamp = localStorage.getItem(`curriculum-timestamp-${name}`);
                return { name, percent, timestamp };
              });

            const maxPercent = Math.max(...userProgress.map((u) => u.percent));

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userProgress.map(({ name, percent, timestamp }) => (
                  <div
                    key={name}
                    className={`p-3 border rounded-xl shadow-sm ${
                      percent === maxPercent ? "bg-yellow-100 border-yellow-500" : ""
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {name} {percent === maxPercent ? "🥇" : ""}
                      </span>
                      <span className="text-sm text-gray-600">
                        {percent}% completed<br />
                        <span className="text-xs">{timestamp ? new Date(timestamp).toLocaleString() : 'No activity yet'}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded"
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