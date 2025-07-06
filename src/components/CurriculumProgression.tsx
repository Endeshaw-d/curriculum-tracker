import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface TopicEntry {
  topic: string;
  code: string;
}

interface YearTopics {
  year: string;
  topics: TopicEntry[];
}

interface SubjectYears {
  [year: string]: TopicEntry[];
}

interface SyllabusData {
  [subject: string]: SubjectYears;
}

const extractProgression = (data: SyllabusData): { [key: string]: YearTopics[] } => {
  const map: { [key: string]: YearTopics[] } = {};
  for (const subject in data) {
    map[subject] = [];
    const years = data[subject];
    const sortedYears = Object.keys(years).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    for (const year of sortedYears) {
      const topics: TopicEntry[] = years[year].map((entry) => ({
        topic: entry.topic,
        code: entry.code,
      }));
      map[subject].push({ year, topics });
    }
  }
  return map;
};

export default function CurriculumProgression() {
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [curriculumData, setCurriculumData] = useState<{ [key: string]: YearTopics[] } | null>(null);
  const [user, setUser] = useState<string>("guest");
  const [progress, setProgress] = useState<{ [code: string]: boolean }>({});
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<string[]>(["guest"]);

  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        const response = await fetch(`/pearson_syllabus_library.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: SyllabusData = await response.json();
        setSyllabusData(data);
        setCurriculumData(extractProgression(data));
      } catch (error) {
        console.error("Failed to load syllabus:", error);
      }
    };

    if (!syllabusData) fetchSyllabus();
  }, [syllabusData]);

  useEffect(() => {
    const storedUser = localStorage.getItem("active-user") || "guest";
    setUser(storedUser);
    const storedProgress = localStorage.getItem(`curriculum-progress-${storedUser}`);
    setProgress(storedProgress ? JSON.parse(storedProgress) : {});

    const usersFromStorage = Object.keys(localStorage)
      .filter((key) => key.startsWith("curriculum-progress-"))
      .map((key) => key.replace("curriculum-progress-", ""))
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
    setAvailableUsers(["guest", ...usersFromStorage]);
  }, []);

  useEffect(() => {
    const savedProgress = localStorage.getItem(`curriculum-progress-${user}`);
    setProgress(savedProgress ? JSON.parse(savedProgress) : {});
  }, [user]);

  const toggleTopic = (code: string) => {
    setProgress((prev) => {
      const updated = { ...prev, [code]: !prev[code] };
      localStorage.setItem(`curriculum-progress-${user}`, JSON.stringify(updated));
      localStorage.setItem(`curriculum-timestamp-${user}`, new Date().toISOString());
      return updated;
    });
  };

  const resetProgress = () => {
    localStorage.removeItem(`curriculum-progress-${user}`);
    localStorage.removeItem(`curriculum-timestamp-${user}`);
    setProgress({});

    const usersFromStorage = Object.keys(localStorage)
      .filter((key) => key.startsWith("curriculum-progress-"))
      .map((key) => key.replace("curriculum-progress-", ""))
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
    setAvailableUsers(["guest", ...usersFromStorage]);
  };

  const calculateProgress = (topics: TopicEntry[]): number => {
    const total = topics.length;
    if (total === 0) return 0;
    const completed = topics.filter((t) => progress[t.code]).length;
    return Math.round((completed / total) * 100);
  };

  if (!curriculumData) {
    return <div className="flex justify-center items-center h-screen text-lg font-semibold text-gray-700">Loading curriculum data...</div>;
  }

  return <div>/* Your UI rendering code here */</div>;
}


